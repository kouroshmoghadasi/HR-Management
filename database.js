const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("hr.db");

// seedDatabase function for initial database seeding
function seedDatabase() {
    db.serialize(() => {
        // Remove previous tables
        db.run(`DROP TABLE IF EXISTS Employees`);
        db.run(`DROP TABLE IF EXISTS FamilyMembers`);
        db.run(`DROP TABLE IF EXISTS Relationships`);
        db.run(`DROP TABLE IF EXISTS Departments`);
        db.run(`DROP TABLE IF EXISTS Roles`);
        db.run(`DROP TABLE IF EXISTS Users`);

        // Create Departments table
        db.run(`CREATE TABLE Departments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT
        )`);

        // Create Roles table
        db.run(`CREATE TABLE Roles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT
        )`);

        // Create Employees table with managerId field
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

        // Create Relationships table
        db.run(`CREATE TABLE Relationships (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT
        )`);

        // Create FamilyMembers table
        db.run(`CREATE TABLE FamilyMembers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employeeId INTEGER,
            name TEXT,
            relationshipId INTEGER,
            birthDate TEXT
        )`);

        // Create Users table
        db.run(`CREATE TABLE Users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT
        )`);

        // Add test data for Departments
        db.run(`INSERT INTO Departments (name) VALUES (?)`, ["Human Resources"]);
        db.run(`INSERT INTO Departments (name) VALUES (?)`, ["IT"]);
        db.run(`INSERT INTO Departments (name) VALUES (?)`, ["Finance"]);
        db.run(`INSERT INTO Departments (name) VALUES (?)`, ["Marketing"]);
        db.run(`INSERT INTO Departments (name) VALUES (?)`, ["Sales"]);
        db.run(`INSERT INTO Departments (name) VALUES (?)`, ["Research & Development"]);
        db.run(`INSERT INTO Departments (name) VALUES (?)`, ["Customer Support"]);
        db.run(`INSERT INTO Departments (name) VALUES (?)`, ["Quality Assurance"]);

        // Add test data for Roles (only once and in correct order)
        db.run(`INSERT INTO Roles (name) VALUES (?)`, ["CEO"]); // 1
        db.run(`INSERT INTO Roles (name) VALUES (?)`, ["Senior Manager"]); // 2
        db.run(`INSERT INTO Roles (name) VALUES (?)`, ["Mid Manager"]); // 3
        db.run(`INSERT INTO Roles (name) VALUES (?)`, ["HR Assistant"]); // 4
        db.run(`INSERT INTO Roles (name) VALUES (?)`, ["IT Specialist"]); // 5
        db.run(`INSERT INTO Roles (name) VALUES (?)`, ["Finance Clerk"]); // 6
        db.run(`INSERT INTO Roles (name) VALUES (?)`, ["Marketing Coordinator"]); // 7
        db.run(`INSERT INTO Roles (name) VALUES (?)`, ["Sales Rep"]); // 8
        db.run(`INSERT INTO Roles (name) VALUES (?)`, ["R&D Engineer"]); // 9
        db.run(`INSERT INTO Roles (name) VALUES (?)`, ["Support Agent"]); // 10
        db.run(`INSERT INTO Roles (name) VALUES (?)`, ["QA Tester"]); // 11

        // Add test data for Employees (realistic structure, 100 employees)
        // CEO
        function randomBirthDate() {
            // Generate a random birth date between 1965-01-01 and 2000-12-31
            const start = new Date(1965, 0, 1).getTime();
            const end = new Date(2000, 11, 31).getTime();
            const d = new Date(start + Math.random() * (end - start));
            // YYYY-MM-DD
            return d.toISOString().slice(0, 10);
        }
        function randomEducation() {
            // Generate a random education field
            const fields = [
                "Computer Science", "Business", "Engineering", "Psychology", "Economics", "Marketing", "Finance", "Mathematics", "Physics", "Biology", "Chemistry", "Political Science", "Sociology", "Education", "Law", "Medicine", "Nursing", "Environmental Science", "History", "Philosophy"
            ];
            return fields[Math.floor(Math.random()*fields.length)];
        }
        // Generate logical and accurate birth date by role (fixed year range for each role)
        function randomBirthDateByRole(roleId) {
            let startYear, endYear;
            if (roleId === 1) { // CEO
                startYear = 1965; endYear = 1975;
            } else if (roleId === 2) { // Senior Manager
                startYear = 1968; endYear = 1980;
            } else if (roleId === 3) { // Mid Manager
                startYear = 1975; endYear = 1990;
            } else { // Staff
                startYear = 1985; endYear = 2000;
            }
            const start = new Date(startYear, 0, 1).getTime();
            const end = new Date(endYear, 11, 31).getTime();
            const d = new Date(start + Math.random() * (end - start));
            return d.toISOString().slice(0, 10);
        }
        db.run(
            `INSERT INTO Employees (employeeCode, name, roleId, departmentId, hireDate, managerId, gender, birthDate, education) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            ["E001", "Ali Rezaei", 1, 1, "2025-01-01", null, 'M', randomBirthDateByRole(1), randomEducation()],
            function(err) {
                if (err) return;
                const ceoId = this.lastID;
                const departments = [
                    { id: 1, name: "Human Resources", staffRole: 4 },
                    { id: 2, name: "IT", staffRole: 5 },
                    { id: 3, name: "Finance", staffRole: 6 },
                    { id: 4, name: "Marketing", staffRole: 7 },
                    { id: 5, name: "Sales", staffRole: 8 },
                    { id: 6, name: "Research & Development", staffRole: 9 },
                    { id: 7, name: "Customer Support", staffRole: 10 },
                    { id: 8, name: "Quality Assurance", staffRole: 11 }
                ];
                let empCount = 1;
                let empCode = n => `E${String(n).padStart(3,'0')}`;
                let genders = ['M','F'];
                let firstNames = ["Liam","Noah","Oliver","Elijah","James","William","Benjamin","Lucas","Henry","Alexander","Charlotte","Amelia","Olivia","Ava","Sophia","Isabella","Mia","Evelyn","Harper","Ella","Jack","Logan","Mason","Ethan","Jacob","Michael","Daniel","Matthew","Aiden","Jackson","Sebastian","Carter","David","Wyatt","John","Owen","Dylan","Luke","Gabriel","Levi","Isaac","Julian","Hudson","Grayson","Ezra","Leo","Lincoln","Jaxon","Asher","Christopher"];
                let lastNames = ["Smith","Brown","Tremblay","Martin","Roy","Wilson","Macdonald","Gagnon","Johnson","Taylor","Lee","Clark","Walker","Wright","King","Scott","Green","Young","Hill","Baker","AdAMS","Nelson","Mitchell","Campbell","Roberts","EvANS","Turner","Parker","Collins","Edwards","Stewart","Morris","Rogers","Cook","Morgan","Bell","Murphy","Bailey","Cooper","Richardson","Cox","Howard","Ward","Torres","Peterson","Gray","Ramirez","James","Watson"];
                // Insert staff recursively
                function insertStaffRecursive(staffList, idx, midId, dep, done) {
                    if (idx >= staffList.length) return done();
                    const staffName = staffList[idx];
                    empCount++;
                    db.run(
                        "INSERT INTO Employees (employeeCode, name, roleId, departmentId, hireDate, managerId, gender, birthDate, education) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                        [empCode(empCount), staffName, dep.staffRole, dep.id, "2025-03-01", midId, genders[empCount%2], randomBirthDateByRole(dep.staffRole), randomEducation()],
                        function(err) {
                            // Continue to next
                            insertStaffRecursive(staffList, idx+1, midId, dep, done);
                        }
                    );
                }
                // Insert mid managers and staff for each department
                function insertMidManagers(m, midManagers, seniorId, dep, done) {
                    if (m >= midManagers.length) return done();
                    empCount++;
                    let midName = midManagers[m];
                    db.run(
                        "INSERT INTO Employees (employeeCode, name, roleId, departmentId, hireDate, managerId, gender, birthDate, education) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                        [empCode(empCount), midName, 3, dep.id, "2025-02-10", seniorId, genders[empCount%2], randomBirthDateByRole(3), randomEducation()],
                        function(err) {
                            if (err) return insertMidManagers(m+1, midManagers, seniorId, dep, done);
                            const midId = this.lastID;
                            // Build staff name list
                            let staffList = [];
                            for(let s=0; s<5 && empCount<100; s++) {
                                staffList.push(firstNames[(dep.id*2+m+s+2)%firstNames.length] + " " + lastNames[(dep.id*5+m+s)%lastNames.length]);
                            }
                            insertStaffRecursive(staffList, 0, midId, dep, () => insertMidManagers(m+1, midManagers, seniorId, dep, done));
                        }
                    );
                }
                // Insert senior managers and their subordinates
                function insertSeniorManagers(dIdx, departments, ceoId, done) {
                    if (dIdx >= departments.length) return done();
                    empCount++;
                    let dep = departments[dIdx];
                    let seniorName = firstNames[(dIdx*2)%firstNames.length] + " " + lastNames[(dIdx*3)%lastNames.length];
                    db.run(
                        "INSERT INTO Employees (employeeCode, name, roleId, departmentId, hireDate, managerId, gender, birthDate, education) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                        [empCode(empCount), seniorName, 2, dep.id, "2025-01-01", ceoId, genders[empCount%2], randomBirthDateByRole(2), randomEducation()],
                        function(err) {
                            if (err) return insertSeniorManagers(dIdx+1, departments, ceoId, done);
                            const seniorId = this.lastID;
                            // Build mid manager name list
                            let midManagers = [];
                            for(let m=0;m<2;m++) {
                                midManagers.push(firstNames[(dIdx*2+m+1)%firstNames.length] + " " + lastNames[(dIdx*4+m)%lastNames.length]);
                            }
                            insertMidManagers(0, midManagers, seniorId, dep, () => insertSeniorManagers(dIdx+1, departments, ceoId, done));
                        }
                    );
                }
                // Start recursive insertion
                insertSeniorManagers(0, departments, ceoId, () => {
                    // Insert test users after all employees are inserted
                    db.run(`INSERT INTO Users (username, password) VALUES (?, ?)`, ["admin", "admin123"]);
                    db.run(`INSERT INTO Users (username, password) VALUES (?, ?)`, ["user", "user123"]);
                });
            }
        );
    });
}

// If this file is run directly, seed the database
if (require.main === module) {
    seedDatabase();
}

module.exports = db;

// Removed db.close(); to prevent closing the database connection
