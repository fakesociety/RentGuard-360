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
-- SEED DATA: Insert the 3 subscription packages
-- =============================================================================
INSERT INTO Packages (Name, Price, ScanLimit, Description, IsActive) VALUES
('Free',   0.00,  1,  'Try RentGuard with 1 free contract scan', 1),
('Single', 10.00, 1,  'One-time single contract scan',           1),
('Basic',  29.00, 5,  '5 contract scans per month',              1),
('Pro',    79.00, -1, 'Unlimited contract scans',                1);
GO

-- =============================================================================
-- STORED PROCEDURE: sp_GetAllPackages
-- Returns all active packages
-- =============================================================================
CREATE PROCEDURE sp_GetAllPackages
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Name, Price, Currency, ScanLimit, Description, IsActive
    FROM Packages
    WHERE IsActive = 1;
END
GO

-- =============================================================================
-- STORED PROCEDURE: sp_GetPackageById
-- Returns a specific package by ID
-- =============================================================================
CREATE PROCEDURE sp_GetPackageById
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Name, Price, Currency, ScanLimit, Description, IsActive
    FROM Packages
    WHERE Id = @Id;
END
GO

-- =============================================================================
-- STORED PROCEDURE: sp_AddTransaction
-- Inserts a new payment transaction and returns the created record
-- =============================================================================
CREATE PROCEDURE sp_AddTransaction
    @UserId          NVARCHAR(128),
    @PackageId       INT,
    @StripePaymentId NVARCHAR(255),
    @Amount          DECIMAL(10,2),
    @Currency        NVARCHAR(10),
    @Status          NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO Transactions (UserId, PackageId, StripePaymentId, Amount, Currency, Status)
    VALUES (@UserId, @PackageId, @StripePaymentId, @Amount, @Currency, @Status);

    SELECT Id, CreatedAt FROM Transactions WHERE Id = SCOPE_IDENTITY();
END
GO

-- =============================================================================
-- STORED PROCEDURE: sp_GetTransactionsByUserId
-- Returns all transactions for a user, newest first
-- =============================================================================
CREATE PROCEDURE sp_GetTransactionsByUserId
    @UserId NVARCHAR(128)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, UserId, PackageId, StripePaymentId, Amount, Currency, Status, CreatedAt
    FROM Transactions
    WHERE UserId = @UserId
    ORDER BY CreatedAt DESC;
END
GO

-- =============================================================================
-- STORED PROCEDURE: sp_GetSubscriptionByUserId
-- Returns the user's current subscription (or empty if none)
-- =============================================================================
CREATE PROCEDURE sp_GetSubscriptionByUserId
    @UserId NVARCHAR(128)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, UserId, PackageId, ScansRemaining, UpdatedAt
    FROM UserSubscriptions
    WHERE UserId = @UserId;
END
GO

-- =============================================================================
-- STORED PROCEDURE: sp_UpsertSubscription
-- Creates or updates a user's subscription (MERGE/UPSERT pattern)
-- =============================================================================
CREATE PROCEDURE sp_UpsertSubscription
    @UserId          NVARCHAR(128),
    @PackageId       INT,
    @ScansRemaining  INT
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM UserSubscriptions WHERE UserId = @UserId)
    BEGIN
        UPDATE UserSubscriptions
        SET PackageId = @PackageId,
            ScansRemaining = @ScansRemaining,
            UpdatedAt = GETDATE()
        WHERE UserId = @UserId;
    END
    ELSE
    BEGIN
        INSERT INTO UserSubscriptions (UserId, PackageId, ScansRemaining)
        VALUES (@UserId, @PackageId, @ScansRemaining);
    END
END
GO

-- =============================================================================
-- STORED PROCEDURE: sp_DeductScan
-- Atomically deducts one scan credit from a user's subscription.
-- Returns success flag and remaining scans via OUTPUT parameters.
-- =============================================================================
CREATE PROCEDURE sp_DeductScan
    @UserId NVARCHAR(128),
    @Success BIT OUTPUT,
    @ScansRemaining INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    -- Check if user has a subscription
    SELECT @ScansRemaining = ScansRemaining
    FROM UserSubscriptions WHERE UserId = @UserId;

    -- No subscription found
    IF @ScansRemaining IS NULL
    BEGIN
        SET @Success = 0;
        SET @ScansRemaining = 0;
        RETURN;
    END

    -- Unlimited plan (-1) → always allow
    IF @ScansRemaining = -1
    BEGIN
        SET @Success = 1;
        RETURN;
    END

    -- No scans left
    IF @ScansRemaining <= 0
    BEGIN
        SET @Success = 0;
        SET @ScansRemaining = 0;
        RETURN;
    END

    -- Deduct one scan atomically
    UPDATE UserSubscriptions
    SET ScansRemaining = ScansRemaining - 1, UpdatedAt = GETDATE()
    WHERE UserId = @UserId AND ScansRemaining > 0;

    -- Return updated count
    SELECT @ScansRemaining = ScansRemaining
    FROM UserSubscriptions WHERE UserId = @UserId;
    SET @Success = 1;
END
GO
