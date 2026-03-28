USE RentGuardPayments;
GO

-- Create pending selections table if it doesn't exist.
IF OBJECT_ID('dbo.PendingPackageSelections', 'U') IS NULL
BEGIN
    CREATE TABLE PendingPackageSelections (
        Id              INT PRIMARY KEY IDENTITY(1,1),
        UserId          NVARCHAR(128) NOT NULL UNIQUE,
        PackageId       INT           NOT NULL,
        PaymentIntentId NVARCHAR(255) NULL,
        SelectedAt      DATETIME      DEFAULT GETDATE(),
        UpdatedAt       DATETIME      DEFAULT GETDATE(),
        CONSTRAINT FK_PendingSelections_Packages FOREIGN KEY (PackageId) REFERENCES Packages(Id)
    );
END
GO

-- 8. sp_UpsertPendingPackageSelection
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

-- 9. sp_DeletePendingPackageSelection
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

-- 10. sp_GetPendingPackageSelectionByUserId
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
