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
