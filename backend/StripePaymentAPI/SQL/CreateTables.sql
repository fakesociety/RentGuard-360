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
('Free',  0.00,  1,  'Try RentGuard with 1 free contract scan', 1),
('Basic', 29.00, 5,  '5 contract scans per month',              1),
('Pro',   79.00, -1, 'Unlimited contract scans',                1);
GO

