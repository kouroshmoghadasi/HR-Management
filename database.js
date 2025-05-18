const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("hr.db");

db.serialize(() => {
    // پاک کردن جدول‌های قبلی
    db.run(`DROP TABLE IF EXISTS Employees`);
    db.run(`DROP TABLE IF EXISTS FamilyMembers`);
    db.run(`DROP TABLE IF EXISTS Relationships`);
    db.run(`DROP TABLE IF EXISTS Departments`);
    db.run(`DROP TABLE IF EXISTS Roles`);
    db.run(`DROP TABLE IF EXISTS Users`);

    // ایجاد جدول Departments
    db.run(`CREATE TABLE Departments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT
    )`);

    // ایجاد جدول Roles
    db.run(`CREATE TABLE Roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT
    )`);

    // ایجاد جدول Employees با فیلد managerId
    db.run(`CREATE TABLE Employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employeeCode TEXT UNIQUE,
        name TEXT,
        roleId INTEGER,
        departmentId INTEGER,
        hireDate TEXT,
        managerId INTEGER,
        gender TEXT,
        birthDate TEXT,
        education TEXT,
        FOREIGN KEY(managerId) REFERENCES Employees(id)
    )`);

    // ایجاد جدول Relationships
    db.run(`CREATE TABLE Relationships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT
    )`);

    // ایجاد جدول FamilyMembers
    db.run(`CREATE TABLE FamilyMembers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employeeId INTEGER,
        name TEXT,
        relationshipId INTEGER,
        birthDate TEXT
    )`);

    // ایجاد جدول Users
    db.run(`CREATE TABLE Users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
    )`);

    // افزودن داده‌های تستی برای Departments
    db.run(`INSERT INTO Departments (name) VALUES (?)`, ["Human Resources"]);
    db.run(`INSERT INTO Departments (name) VALUES (?)`, ["IT"]);
    db.run(`INSERT INTO Departments (name) VALUES (?)`, ["Finance"]);
    db.run(`INSERT INTO Departments (name) VALUES (?)`, ["Marketing"]);
    db.run(`INSERT INTO Departments (name) VALUES (?)`, ["Sales"]);
    db.run(`INSERT INTO Departments (name) VALUES (?)`, ["Research & Development"]);
    db.run(`INSERT INTO Departments (name) VALUES (?)`, ["Customer Support"]);
    db.run(`INSERT INTO Departments (name) VALUES (?)`, ["Quality Assurance"]);

    // افزودن داده‌های تستی برای Roles
    db.run(`INSERT INTO Roles (name) VALUES (?)`, ["CEO"]); // مدیرعامل
    db.run(`INSERT INTO Roles (name) VALUES (?)`, ["Senior Manager"]); // مدیر ارشد
    db.run(`INSERT INTO Roles (name) VALUES (?)`, ["Mid Manager"]); // مدیر میانی
    db.run(`INSERT INTO Roles (name) VALUES (?)`, ["HR Assistant"]);

    // افزودن داده‌های تستی برای Employees
    db.run(
        `INSERT INTO Employees (employeeCode, name, roleId, departmentId, hireDate, managerId) VALUES (?, ?, ?, ?, ?, ?)`,
        ["HR001", "Ali Rezaei", 1, 1, "2025-01-01", null],
    ); // CEO, بدون مدیر
    db.run(
        `INSERT INTO Employees (employeeCode, name, roleId, departmentId, hireDate, managerId) VALUES (?, ?, ?, ?, ?, ?)`,
        ["HR002", "Sara Ahmadi", 2, 1, "2025-03-15", 1],
    ); // Senior Manager, گزارش به CEO
    db.run(
        `INSERT INTO Employees (employeeCode, name, roleId, departmentId, hireDate, managerId) VALUES (?, ?, ?, ?, ?, ?)`,
        ["HR003", "Hassan Mohammadi", 3, 1, "2025-04-01", 2],
    ); // Mid Manager, گزارش به Sara
    db.run(
        `INSERT INTO Employees (employeeCode, name, roleId, departmentId, hireDate, managerId) VALUES (?, ?, ?, ?, ?, ?)`,
        ["HR004", "Reza Hosseini", 4, 1, "2025-05-01", 2],
    ); // HR Assistant, گزارش به Sara

    // اضافه کردن 96 رکورد تستی دیگر به صورت مستقیم
    const iranianNames = [
        "محمد", "علی", "حسین", "رضا", "مهدی", "فاطمه", "زهرا", "مریم", "سارا", "نرگس",
        "امیر", "حسن", "احمد", "محسن", "سعید", "لیلا", "زینب", "الهام", "نازنین", "مینا"
    ];

    const iranianFamilyNames = [
        "حسینی", "محمدی", "رضایی", "احمدی", "موسوی", "هاشمی", "کریمی", "سعیدی", "علوی", "نجفی",
        "عباسی", "رحیمی", "صادقی", "اکبری", "یوسفی", "جعفری", "حیدری", "قاسمی", "عزیزی", "فرهادی"
    ];

    const testEmployees = Array.from({length: 96}, (_, i) => {
        const employeeId = i + 5;
        const firstName = iranianNames[Math.floor(Math.random() * iranianNames.length)];
        const lastName = iranianFamilyNames[Math.floor(Math.random() * iranianFamilyNames.length)];
        // تعیین جنسیت بر اساس نام
        const isFemale = iranianNames.indexOf(firstName) >= 10; // نام‌های زن از ایندکس 10 به بعد هستند
        return [
            `HR${employeeId.toString().padStart(3, '0')}`,
            `${firstName} ${lastName}`,
            Math.floor(Math.random() * 4) + 1,
            Math.floor(Math.random() * 8) + 1,
            `2025-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
            Math.floor(Math.random() * 4) + 1,
            isFemale ? 'F' : 'M' // اضافه کردن جنسیت
        ];
    });

    const stmt = db.prepare(`INSERT INTO Employees (employeeCode, name, roleId, departmentId, hireDate, managerId, gender) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    testEmployees.forEach(employee => stmt.run(employee));
    stmt.finalize();

    // افزودن داده‌های تستی برای اعضای خانواده
    testEmployees.forEach((employee, index) => {
        // اضافه کردن همسر
        if (Math.random() > 0.3) { // 70% احتمال داشتن همسر
            const spouseName = `${iranianNames[Math.floor(Math.random() * iranianNames.length)]} ${iranianFamilyNames[Math.floor(Math.random() * iranianFamilyNames.length)]}`;
            db.run(
                `INSERT INTO FamilyMembers (employeeId, name, relationshipId, birthDate) VALUES (?, ?, ?, ?)`,
                [index + 5, spouseName, 1, `199${Math.floor(Math.random() * 9)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`]
            );
        }

        // اضافه کردن فرزند
        if (Math.random() > 0.5) { // 50% احتمال داشتن فرزند
            const childName = `${iranianNames[Math.floor(Math.random() * iranianNames.length)]} ${employee[1].split(' ')[1]}`;
            db.run(
                `INSERT INTO FamilyMembers (employeeId, name, relationshipId, birthDate) VALUES (?, ?, ?, ?)`,
                [index + 5, childName, 2, `201${Math.floor(Math.random() * 5)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`]
            );
        }
    });

    // افزودن داده‌های تستی برای Relationships
    db.run(`INSERT INTO Relationships (name) VALUES (?)`, ["Spouse"]);
    db.run(`INSERT INTO Relationships (name) VALUES (?)`, ["Child"]);
    db.run(`INSERT INTO Relationships (name) VALUES (?)`, ["Parent"]);
    db.run(`INSERT INTO Relationships (name) VALUES (?)`, ["Sibling"]);

    // افزودن داده‌های تستی برای FamilyMembers
    db.run(
        `INSERT INTO FamilyMembers (employeeId, name, relationshipId, birthDate) VALUES (?, ?, ?, ?)`,
        [1, "Maryam Rezaei", 1, "1990-05-20"],
    ); // Spouse
    db.run(
        `INSERT INTO FamilyMembers (employeeId, name, relationshipId, birthDate) VALUES (?, ?, ?, ?)`,
        [2, "Amir Ahmadi", 2, "2015-08-10"],
    ); // Child
    db.run(
        `INSERT INTO FamilyMembers (employeeId, name, relationshipId, birthDate) VALUES (?, ?, ?, ?)`,
        [3, "Zahra Mohammadi", 2, "2018-02-14"],
    ); // Child

    // افزودن کاربر تستی
    db.run(`INSERT INTO Users (username, password) VALUES (?, ?)`, ["admin", "admin"]);
});

module.exports = db;
