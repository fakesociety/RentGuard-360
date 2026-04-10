-- =============================================================================
-- SQL TABLE CREATION SCRIPT FOR RENTGUARD-360 STRIPE PAYMENTS
-- Run this in SSMS connected to your AWS RDS SQL Server instance.
-- =============================================================================

-- 1. Switch to master to drop/create database
USE master;
GO

-- Drop Database if it exists (closes active connections first)
IF EXISTS (SELECT name FROM sys.databases WHERE name = N'RentGuardPayments')
BEGIN
    ALTER DATABASE RentGuardPayments SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE RentGuardPayments;
END
GO

-- Create the Database
CREATE DATABASE RentGuardPayments;
GO

-- 2. Switch to the new database
USE RentGuardPayments;
GO

-- =============================================================================
-- TABLE 1: Packages - Available subscription plans
-- =============================================================================
CREATE TABLE Packages (
    Id          INT PRIMARY KEY IDENTITY(1,1),
    Name        NVARCHAR(50)   NOT NULL,
    Price       DECIMAL(10,2)  NOT NULL,
    Currency    NVARCHAR(10)   DEFAULT 'ILS',
    ScanLimit   INT            NOT NULL,       -- -1 means unlimited
    Description NVARCHAR(255),
    IsActive    BIT            DEFAULT 1
);

-- =============================================================================
-- TABLE 2: Transactions - Every Stripe payment record
-- =============================================================================
CREATE TABLE Transactions (
    Id                  INT PRIMARY KEY IDENTITY(1,1),
    UserId              NVARCHAR(128) NOT NULL,       -- Cognito sub (UUID)
    PackageId           INT           NOT NULL,
    StripePaymentId     NVARCHAR(255) NOT NULL,
    Amount              DECIMAL(10,2) NOT NULL,
    Currency            NVARCHAR(10)  DEFAULT 'ILS',
    Status              NVARCHAR(50)  NOT NULL,       -- 'succeeded','pending','failed'
    CreatedAt           DATETIME      DEFAULT GETDATE(),
    CONSTRAINT FK_Transactions_Packages FOREIGN KEY (PackageId) REFERENCES Packages(Id)
);

-- =============================================================================
-- TABLE 3: UserSubscriptions - Current subscription state per user
-- =============================================================================
CREATE TABLE UserSubscriptions (
    Id              INT PRIMARY KEY IDENTITY(1,1),
    UserId          NVARCHAR(128) NOT NULL UNIQUE,    -- Cognito sub (UUID)
    PackageId       INT           NOT NULL,
    ScansRemaining  INT           NOT NULL,
    UpdatedAt       DATETIME      DEFAULT GETDATE(),
    CONSTRAINT FK_UserSubscriptions_Packages FOREIGN KEY (PackageId) REFERENCES Packages(Id)
);

-- =============================================================================
-- TABLE 4: PendingPackageSelections - Selected package before payment completes
-- =============================================================================
CREATE TABLE PendingPackageSelections (
    Id              INT PRIMARY KEY IDENTITY(1,1),
    UserId          NVARCHAR(128) NOT NULL UNIQUE,
    PackageId       INT           NOT NULL,
    PaymentIntentId NVARCHAR(255) NULL,
    SelectedAt      DATETIME      DEFAULT GETDATE(),
    UpdatedAt       DATETIME      DEFAULT GETDATE(),
    CONSTRAINT FK_PendingSelections_Packages FOREIGN KEY (PackageId) REFERENCES Packages(Id)
);

-- =============================================================================
-- SEED DATA: Insert the 3 subscription packages
-- =============================================================================
INSERT INTO Packages (Name, Price, ScanLimit, Description, IsActive) VALUES
('Free',   0.00,  1,  'Try RentGuard with 1 free contract scan', 1),
('Single', 10.00, 1,  'One-time single contract scan',           1),
('Basic',  29.00, 5,  '5 contract scans per month',              1),
('Pro',    79.00, 15, '15 contract scans',                        1);
GO

-- =============================================================================
-- STORED PROCEDURES
-- =============================================================================
-- Run this file after CreateTables:
-- backend/StripePaymentAPI/Repositories/SQL/02_StoredProcedures.sql
USE RentGuardPayments;
GO

-- =============================================
-- 1. sp_GetAllPackages
-- =============================================
IF OBJECT_ID('sp_GetAllPackages', 'P') IS NOT NULL DROP PROCEDURE sp_GetAllPackages;
GO
CREATE PROCEDURE sp_GetAllPackages
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Name, Price, Currency, ScanLimit, Description, IsActive
    FROM Packages
    WHERE IsActive = 1;
END;
GO

-- =============================================
-- 2. sp_GetPackageById
-- =============================================
IF OBJECT_ID('sp_GetPackageById', 'P') IS NOT NULL DROP PROCEDURE sp_GetPackageById;
GO
CREATE PROCEDURE sp_GetPackageById
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Name, Price, Currency, ScanLimit, Description, IsActive
    FROM Packages
    WHERE Id = @Id;
END;
GO

-- =============================================
-- 3. sp_AddTransaction
-- =============================================
IF OBJECT_ID('sp_AddTransaction', 'P') IS NOT NULL DROP PROCEDURE sp_AddTransaction;
GO
CREATE PROCEDURE sp_AddTransaction
    @UserId NVARCHAR(100),
    @PackageId INT,
    @StripePaymentId NVARCHAR(100),
    @Amount DECIMAL(18,2),
    @Currency NVARCHAR(10),
    @Status NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO Transactions (UserId, PackageId, StripePaymentId, Amount, Currency, Status)
    OUTPUT INSERTED.Id, INSERTED.CreatedAt
    VALUES (@UserId, @PackageId, @StripePaymentId, @Amount, @Currency, @Status);
END;
GO

-- =============================================
-- 4. sp_GetTransactionsByUserId
-- =============================================
IF OBJECT_ID('sp_GetTransactionsByUserId', 'P') IS NOT NULL DROP PROCEDURE sp_GetTransactionsByUserId;
GO
CREATE PROCEDURE sp_GetTransactionsByUserId
    @UserId NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, UserId, PackageId, StripePaymentId, Amount, Currency, Status, CreatedAt
    FROM Transactions
    WHERE UserId = @UserId
    ORDER BY CreatedAt DESC;
END;
GO

-- =============================================
-- 5. sp_GetSubscriptionByUserId
-- =============================================
IF OBJECT_ID('sp_GetSubscriptionByUserId', 'P') IS NOT NULL DROP PROCEDURE sp_GetSubscriptionByUserId;
GO
CREATE PROCEDURE sp_GetSubscriptionByUserId
    @UserId NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, UserId, PackageId, ScansRemaining, UpdatedAt
    FROM UserSubscriptions
    WHERE UserId = @UserId;
END;
GO

-- =============================================
-- 6. sp_UpsertSubscription
-- =============================================
IF OBJECT_ID('sp_UpsertSubscription', 'P') IS NOT NULL DROP PROCEDURE sp_UpsertSubscription;
GO
CREATE PROCEDURE sp_UpsertSubscription
    @UserId NVARCHAR(100),
    @PackageId INT,
    @ScansRemaining INT
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM UserSubscriptions WHERE UserId = @UserId)
    BEGIN
        UPDATE UserSubscriptions
        SET
            PackageId = @PackageId,
            ScansRemaining = CASE
                WHEN @ScansRemaining = -1 THEN -1
                WHEN ScansRemaining = -1 THEN -1
                ELSE ISNULL(ScansRemaining, 0) + @ScansRemaining
            END,
            UpdatedAt = GETDATE()
        WHERE UserId = @UserId;
    END
    ELSE
    BEGIN
        INSERT INTO UserSubscriptions (UserId, PackageId, ScansRemaining, UpdatedAt)
        VALUES (@UserId, @PackageId, @ScansRemaining, GETDATE());
    END
END;
GO

-- =============================================
-- 7. sp_DeductScan
-- =============================================
IF OBJECT_ID('sp_DeductScan', 'P') IS NOT NULL DROP PROCEDURE sp_DeductScan;
GO
CREATE PROCEDURE sp_DeductScan
    @UserId NVARCHAR(128),
    @Success BIT OUTPUT,
    @RemainingScans INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    -- Check if user has a subscription
    SELECT @RemainingScans = ScansRemaining
    FROM UserSubscriptions WHERE UserId = @UserId;

    -- No subscription found
    IF @RemainingScans IS NULL
    BEGIN
        SET @Success = 0;
        SET @RemainingScans = 0;
        RETURN;
    END

    -- Unlimited plan (-1) - always allow, do not deduct
    IF @RemainingScans = -1
    BEGIN
        SET @Success = 1;
        RETURN;
    END

    -- No scans left
    IF @RemainingScans <= 0
    BEGIN
        SET @Success = 0;
        SET @RemainingScans = 0;
        RETURN;
    END

    -- Deduct one scan atomically
    UPDATE UserSubscriptions
    SET ScansRemaining = ScansRemaining - 1, UpdatedAt = GETDATE()
    WHERE UserId = @UserId AND ScansRemaining > 0;

    -- Return updated count
    SELECT @RemainingScans = ScansRemaining
    FROM UserSubscriptions WHERE UserId = @UserId;
    SET @Success = 1;
END
GO

-- =============================================
-- 8. sp_UpsertPendingPackageSelection
-- =============================================
IF OBJECT_ID('sp_UpsertPendingPackageSelection', 'P') IS NOT NULL DROP PROCEDURE sp_UpsertPendingPackageSelection;
GO
CREATE PROCEDURE sp_UpsertPendingPackageSelection
    @UserId NVARCHAR(128),
    @PackageId INT,
    @PaymentIntentId NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM PendingPackageSelections WHERE UserId = @UserId)
    BEGIN
        UPDATE PendingPackageSelections
        SET
            PackageId = @PackageId,
            PaymentIntentId = @PaymentIntentId,
            UpdatedAt = GETDATE()
        WHERE UserId = @UserId;
    END
    ELSE
    BEGIN
        INSERT INTO PendingPackageSelections (UserId, PackageId, PaymentIntentId, SelectedAt, UpdatedAt)
        VALUES (@UserId, @PackageId, @PaymentIntentId, GETDATE(), GETDATE());
    END
END;
GO

-- =============================================
-- 9. sp_DeletePendingPackageSelection
-- =============================================
IF OBJECT_ID('sp_DeletePendingPackageSelection', 'P') IS NOT NULL DROP PROCEDURE sp_DeletePendingPackageSelection;
GO
CREATE PROCEDURE sp_DeletePendingPackageSelection
    @UserId NVARCHAR(128)
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM PendingPackageSelections WHERE UserId = @UserId;
END;
GO

-- =============================================
-- 10. sp_GetPendingPackageSelectionByUserId
-- =============================================
IF OBJECT_ID('sp_GetPendingPackageSelectionByUserId', 'P') IS NOT NULL DROP PROCEDURE sp_GetPendingPackageSelectionByUserId;
GO
CREATE PROCEDURE sp_GetPendingPackageSelectionByUserId
    @UserId NVARCHAR(128)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, UserId, PackageId, PaymentIntentId, SelectedAt, UpdatedAt
    FROM PendingPackageSelections
    WHERE UserId = @UserId;
END;
GO
