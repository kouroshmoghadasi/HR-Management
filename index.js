const express = require("express");
const app = express();
const path = require("path");
const db = require("./database");
const session = require('express-session');

app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false
}));

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        res.redirect('/login');
    } else {
        next();
    }
};

// Setting up JSON parsing
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// API to get all departments
app.get("/api/departments", (req, res) => {
    db.all("SELECT * FROM Departments", [], (err, rows) => {
        if (err) {
            res.status(500).send("Database error");
        } else {
            res.json(rows);
        }
    });
});

// Login route
app.get('/login', (req, res) => {
    if (req.session.user) {
        res.redirect('/');
    } else {
        res.sendFile(path.join(__dirname, 'public', 'login.html'));
    }
});

// Login API
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM Users WHERE username = ? AND password = ?', [username, password], (err, user) => {
        if (err) {
            res.status(500).send('Database error');
        } else if (user) {
            req.session.user = { id: user.id, username: user.username };
            res.json({ success: true });
        } else {
            res.status(401).send('Invalid credentials');
        }
    });
});

// Logout route
app.get('/api/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// API to add a department
app.post("/api/departments", (req, res) => {
    const { name } = req.body;
    db.run(`INSERT INTO Departments (name) VALUES (?)`, [name], function (err) {
        if (err) {
            res.status(500).send("Database error");
        } else {
            res.json({ id: this.lastID });
        }
    });
});

// API to edit a department
app.put("/api/departments/:id", (req, res) => {
    const { name } = req.body;
    const id = req.params.id;
    db.run(
        `UPDATE Departments SET name = ? WHERE id = ?`,
        [name, id],
        function (err) {
            if (err) {
                res.status(500).send("Database error");
            } else {
                res.json({ updated: this.changes });
            }
        },
    );
});

// API to delete a department
app.delete("/api/departments/:id", (req, res) => {
    const id = req.params.id;
    db.run(`DELETE FROM Departments WHERE id = ?`, [id], function (err) {
        if (err) {
            res.status(500).send("Database error");
        } else {
            res.json({ deleted: this.changes });
        }
    });
});

// API to get all roles
app.get("/api/roles", (req, res) => {
    db.all("SELECT * FROM Roles", [], (err, rows) => {
        if (err) {
            res.status(500).send("Database error");
        } else {
            res.json(rows);
        }
    });
});

// API to add a role
app.post("/api/roles", (req, res) => {
    const { name } = req.body;
    db.run(`INSERT INTO Roles (name) VALUES (?)`, [name], function (err) {
        if (err) {
            res.status(500).send("Database error");
        } else {
            res.json({ id: this.lastID });
        }
    });
});

// API to edit a role
app.put("/api/roles/:id", (req, res) => {
    const { name } = req.body;
    const id = req.params.id;
    db.run(
        `UPDATE Roles SET name = ? WHERE id = ?`,
        [name, id],
        function (err) {
            if (err) {
                res.status(500).send("Database error");
            } else {
                res.json({ updated: this.changes });
            }
        },
    );
});

// API to delete a role
app.delete("/api/roles/:id", (req, res) => {
    const id = req.params.id;
    db.run(`DELETE FROM Roles WHERE id = ?`, [id], function (err) {
        if (err) {
            res.status(500).send("Database error");
        } else {
            res.json({ deleted: this.changes });
        }
    });
});

// Profile API endpoints
app.get("/api/profile", (req, res) => {
    // For demo purposes, returning mock data
    res.json({
        name: "John Doe",
        role: "HR Manager",
        email: "john.doe@company.com",
        phone: "+1234567890",
        address: "123 Main St, City",
        bio: "HR professional with 5 years of experience"
    });
});

app.put("/api/profile", (req, res) => {
    const { phone, address, bio } = req.body;
    // Here you would typically update the database
    res.json({ success: true });
});

// API to get all employees with filter and pagination
app.get("/api/employees", (req, res) => {
    const {
        page = 1,
        limit = 10,
        departmentId,
        roleId,
        managerId,
        search,
        gender,
        searchCode // Added
    } = req.query;
    const offset = (page - 1) * limit;

    let query = `
        SELECT Employees.id, Employees.employeeCode, Employees.name, Employees.roleId, 
               Employees.departmentId, Employees.hireDate, Employees.managerId, Employees.gender,
               Employees.birthDate, Employees.education, 
               Roles.name AS roleName, Departments.name AS departmentName,
               Managers.name AS managerName,
               (SELECT COUNT(*) FROM Employees AS Subordinates WHERE Subordinates.managerId = Employees.id) AS subordinateCount
        FROM Employees 
        JOIN Roles ON Employees.roleId = Roles.id 
        JOIN Departments ON Employees.departmentId = Departments.id
        LEFT JOIN Employees AS Managers ON Employees.managerId = Managers.id
    `;

    let countQuery = `SELECT COUNT(*) AS total FROM Employees`;
    let params = [];
    let conditions = [];

    if (departmentId) {
        conditions.push(`Employees.departmentId = ?`);
        params.push(departmentId);
    }
    if (roleId) {
        conditions.push(`Employees.roleId = ?`);
        params.push(roleId);
    }
    if (managerId) {
        conditions.push(`Employees.managerId = ?`);
        params.push(managerId);
    }
    if (search) {
        conditions.push(`Employees.name LIKE ?`);
        params.push(`%${search}%`);
    }
    if (searchCode) { // Added
        conditions.push(`Employees.employeeCode LIKE ?`);
        params.push(`%${searchCode}%`);
    }
    if (gender) {
        conditions.push(`Employees.gender = ?`);
        params.push(gender);
    }

    if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(" AND ")}`;
        countQuery += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).send("Database error");
            return;
        }
        db.get(countQuery, params.slice(0, -2), (err, countRow) => {
            if (err) {
                res.status(500).send("Database error");
            } else {
                res.json({
                    employees: rows,
                    total: countRow.total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                });
            }
        });
    });
});

// API to add an employee with CEO validation
app.post("/api/employees", (req, res) => {
    const { employeeCode, name, roleId, departmentId, hireDate, managerId } =
        req.body;

    // If managerId=null, check that there is no other CEO
    if (!managerId) {
        db.get(
            `SELECT COUNT(*) AS ceoCount FROM Employees WHERE managerId IS NULL`,
            [],
            (err, row) => {
                if (err) {
                    res.status(500).send("Database error");
                    return;
                }
                if (row.ceoCount > 0) {
                    res.status(400).send(
                        "There can only be one CEO (employee with no manager).",
                    );
                    return;
                }
                insertEmployee();
            },
        );
    } else {
        insertEmployee();
    }

    function insertEmployee() {
        db.run(
            `INSERT INTO Employees (employeeCode, name, roleId, departmentId, hireDate, managerId) VALUES (?, ?, ?, ?, ?, ?)`,
            [
                employeeCode,
                name,
                roleId,
                departmentId,
                hireDate,
                managerId || null,
            ],
            function (err) {
                if (err) {
                    res.status(500).send("Database error: " + err.message);
                } else {
                    res.json({ id: this.lastID });
                }
            },
        );
    }
});

// API to edit an employee with CEO validation
app.put("/api/employees/:id", (req, res) => {
    const { employeeCode, name, roleId, departmentId, hireDate, managerId } =
        req.body;
    const id = req.params.id;

    // Prevent setting employee as their own manager
    if (managerId && parseInt(managerId) === parseInt(id)) {
        res.status(400).send("An employee cannot be their own manager.");
        return;
    }

    // If managerId=null, check that there is no other CEO
    if (!managerId) {
        db.get(
            `SELECT COUNT(*) AS ceoCount FROM Employees WHERE managerId IS NULL AND id != ?`,
            [id],
            (err, row) => {
                if (err) {
                    res.status(500).send("Database error");
                    return;
                }
                if (row.ceoCount > 0) {
                    res.status(400).send(
                        "There can only be one CEO (employee with no manager).",
                    );
                    return;
                }
                updateEmployee();
            },
        );
    } else {
        updateEmployee();
    }

    function updateEmployee() {
        db.run(
            `UPDATE Employees SET employeeCode = ?, name = ?, roleId = ?, departmentId = ?, hireDate = ?, managerId = ? WHERE id = ?`,
            [
                employeeCode,
                name,
                roleId,
                departmentId,
                hireDate,
                managerId || null,
                id,
            ],
            function (err) {
                if (err) {
                    res.status(500).send("Database error: " + err.message);
                } else {
                    res.json({ updated: this.changes });
                }
            },
        );
    }
});

// API to delete an employee
app.delete("/api/employees/:id", (req, res) => {
    const id = req.params.id;
    // Before deleting, set managerId of the employee reporting to this employee to null
    db.run(
        `UPDATE Employees SET managerId = NULL WHERE managerId = ?`,
        [id],
        function (err) {
            if (err) {
                res.status(500).send("Database error");
                return;
            }
            db.run(`DELETE FROM Employees WHERE id = ?`, [id], function (err) {
                if (err) {
                    res.status(500).send("Database error");
                } else {
                    res.json({ deleted: this.changes });
                }
            });
        },
    );
});

// CEO at the top, departments as children, employees under departments
app.get("/api/orgchart", (req, res) => {
    db.get(`SELECT Employees.id, Employees.name, Employees.roleId, Roles.name AS roleName
            FROM Employees JOIN Roles ON Employees.roleId = Roles.id
            WHERE Employees.managerId IS NULL LIMIT 1`, [], (err, ceo) => {
        if (err || !ceo) {
            return res.status(500).send("No CEO found");
        }
        db.all("SELECT * FROM Departments", [], (err, departments) => {
            if (err) {
                return res.status(500).send("Database error: " + err.message);
            }
            db.all(`SELECT Employees.id, Employees.name, Employees.roleId, Roles.name AS roleName, Employees.managerId, Employees.departmentId
                    FROM Employees JOIN Roles ON Employees.roleId = Roles.id WHERE Employees.managerId IS NOT NULL`, [], (err, employees) => {
                if (err) {
                    return res.status(500).send("Database error: " + err.message);
                }
                // Grouping employees by department
                const deptMap = {};
                departments.forEach(dept => {
                    deptMap[dept.id] = {
                        id: `dept_${dept.id}`,
                        name: dept.name,
                        title: "Department",
                        type: "department",
                        children: []
                    };
                });
                // Adding employees to the corresponding department
                employees.forEach(emp => {
                    deptMap[emp.departmentId].children.push({
                        id: emp.id,
                        name: emp.name,
                        title: emp.roleName,
                        type: "employee",
                        managerId: emp.managerId
                    });
                });
                // Manager-subordinate hierarchy within each department
                Object.values(deptMap).forEach(dept => {
                    const empMap = {};
                    dept.children.forEach(e => empMap[e.id] = e);
                    dept.children.forEach(e => {
                        if (e.managerId && empMap[e.managerId]) {
                            empMap[e.managerId].children = empMap[e.managerId].children || [];
                            empMap[e.managerId].children.push(e);
                        }
                    });
                    dept.children = dept.children.filter(e => !e.managerId || !empMap[e.managerId]);
                });
                // CEO root node
                const root = {
                    id: `ceo_${ceo.id}`,
                    name: ceo.name,
                    title: ceo.roleName,
                    type: "ceo",
                    children: Object.values(deptMap)
                };
                res.json([root]);
            });
        });
    });
});

// API to get all relationships
app.get("/api/relationships", (req, res) => {
    db.all("SELECT * FROM Relationships", [], (err, rows) => {
        if (err) {
            res.status(500).send("Database error");
        } else {
            res.json(rows);
        }
    });
});

// API to add a relationship
app.post("/api/relationships", (req, res) => {
    const { name } = req.body;
    db.run(
        `INSERT INTO Relationships (name) VALUES (?)`,
        [name],
        function (err) {
            if (err) {
                res.status(500).send("Database error");
            } else {
                res.json({ id: this.lastID });
            }
        },
    );
});

// API to edit a relationship
app.put("/api/relationships/:id", (req, res) => {
    const { name } = req.body;
    const id = req.params.id;
    db.run(
        `UPDATE Relationships SET name = ? WHERE id = ?`,
        [name, id],
        function (err) {
            if (err) {
                res.status(500).send("Database error");
            } else {
                res.json({ updated: this.changes });
            }
        },
    );
});

// API to delete a relationship
app.delete("/api/relationships/:id", (req, res) => {
    const id = req.params.id;
    db.run(`DELETE FROM Relationships WHERE id = ?`, [id], function (err) {
        if (err) {
            res.status(500).send("Database error");
        } else {
            res.json({ deleted: this.changes });
        }
    });
});

// API to get all family members
app.get("/api/family", (req, res) => {
    db.all(
        `SELECT FamilyMembers.id, FamilyMembers.employeeId, FamilyMembers.name, 
                FamilyMembers.relationshipId, FamilyMembers.birthDate, 
                Employees.name AS employeeName, Relationships.name AS relationshipName 
         FROM FamilyMembers 
         JOIN Employees ON FamilyMembers.employeeId = Employees.id 
         JOIN Relationships ON FamilyMembers.relationshipId = Relationships.id`,
        [],
        (err, rows) => {
            if (err) {
                res.status(500).send("Database error");
            } else {
                res.json(rows);
            }
        },
    );
});

// API to add a family member
app.post("/api/family", (req, res) => {
    const { employeeId, name, relationshipId, birthDate } = req.body;
    db.run(
        `INSERT INTO FamilyMembers (employeeId, name, relationshipId, birthDate) VALUES (?, ?, ?, ?)`,
        [employeeId, name, relationshipId, birthDate],
        function (err) {
            if (err) {
                res.status(500).send("Database error");
            } else {
                res.json({ id: this.lastID });
            }
        },
    );
});

// API to edit a family member
app.put("/api/family/:id", (req, res) => {
    const { employeeId, name, relationshipId, birthDate } = req.body;
    const id = req.params.id;
    db.run(
        `UPDATE FamilyMembers SET employeeId = ?, name = ?, relationshipId = ?, birthDate = ? WHERE id = ?`,
        [employeeId, name, relationshipId, birthDate, id],
        function (err) {
            if (err) {
                res.status(500).send("Database error");
            } else {
                res.json({ updated: this.changes });
            }
        },
    );
});

// API to delete a family member
app.delete("/api/family/:id", (req, res) => {
    const id = req.params.id;
    db.run(`DELETE FROM FamilyMembers WHERE id = ?`, [id], function (err) {
        if (err) {
            res.status(500).send("Database error");
        } else {
            res.json({ deleted: this.changes });
        }
    });
});

// Route for the main page
// API for analytical dashboard data
app.get("/api/dashboard/analytics", (req, res) => {
    console.log('Dashboard analytics endpoint called'); // Debug log
    db.all(`
        SELECT 
            gender,
            education,
            birthDate,
            departmentId,
            COUNT(*) as count
        FROM Employees
        GROUP BY gender, education, departmentId
    `, [], (err, rows) => {
        if (err) {
            res.status(500).send("Database error");
            return;
        }

        const analytics = {
            totalEmployees: 0,
            averageAge: 0,
            genderDistribution: { male: 0, female: 0 },
            educationDistribution: {},
            ageDistribution: {},
            departmentDistribution: {}
        };

        let totalAge = 0;
        let totalEmployees = 0;

        rows.forEach(row => {
            totalEmployees += row.count;

            // Calculate age
            if (row.birthDate) {
                const age = new Date().getFullYear() - new Date(row.birthDate).getFullYear();
                totalAge += age * row.count;

                // Age grouping
                const ageGroup = Math.floor(age / 5) * 5;
                const ageGroupLabel = `${ageGroup}-${ageGroup + 4}`;
                analytics.ageDistribution[ageGroupLabel] = (analytics.ageDistribution[ageGroupLabel] || 0) + row.count;
            }

            // Gender distribution
            if (row.gender === 'M') {
                analytics.genderDistribution.male += row.count;
            } else if (row.gender === 'F') {
                analytics.genderDistribution.female += row.count;
            }

            // Education distribution
            if (row.education) {
                analytics.educationDistribution[row.education] = (analytics.educationDistribution[row.education] || 0) + row.count;
            }

            // Department distribution
            if (row.departmentId) {
                analytics.departmentDistribution[row.departmentId] = (analytics.departmentDistribution[row.departmentId] || 0) + row.count;
            }
        });

        analytics.totalEmployees = totalEmployees;
        analytics.averageAge = totalEmployees > 0 ? totalAge / totalEmployees : 0;

        // Convert gender ratios
        const maleCount = rows.find(r => r.gender === 'M')?.count || 0;
            const femaleCount = rows.find(r => r.gender === 'F')?.count || 0;
            const total = maleCount + femaleCount;

            analytics.genderDistribution = {
                male: total > 0 ? maleCount / total : 0,
                female: total > 0 ? femaleCount / total : 0
            };

            res.json(analytics);
        });
});

// Main page (dashboard) route, accessible only to logged-in users
app.get('/', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route for the employees page
app.get("/employees", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "employees.html"));
});

// Route for the family members page
app.get("/family", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "family.html"));
});

// Route for the settings page
app.get("/settings", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "settings.html"));
});

// Route for the organizational chart page
app.get("/orgchart", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "orgchart.html"));
});

// Profile page route
app.get("/profile", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "profile.html"));
});

// API to get current user
app.get('/api/current-user', (req, res) => {
    if (req.session && req.session.user) {
        res.json({ username: req.session.user.username });
    } else {
        res.json({ username: null });
    }
});

// Export filtered employees to CSV (no pagination, all filtered records)
app.get("/api/employees/export", (req, res) => {
    // Only allow these filters, ignore any page/limit
    const departmentId = req.query.departmentId;
    const roleId = req.query.roleId;
    const managerId = req.query.managerId;
    const search = req.query.search;
    const gender = req.query.gender;

    let query = `
        SELECT Employees.id, Employees.employeeCode, Employees.name, Employees.roleId, 
               Employees.departmentId, Employees.hireDate, Employees.managerId, Employees.gender,
               Employees.birthDate, Employees.education, 
               Roles.name AS roleName, Departments.name AS departmentName,
               Managers.name AS managerName
        FROM Employees 
        JOIN Roles ON Employees.roleId = Roles.id 
        JOIN Departments ON Employees.departmentId = Departments.id
        LEFT JOIN Employees AS Managers ON Employees.managerId = Managers.id
    `;
    let params = [];
    let conditions = [];

    if (departmentId && departmentId !== "") {
        conditions.push(`Employees.departmentId = ?`);
        params.push(departmentId);
    }
    if (roleId && roleId !== "") {
        conditions.push(`Employees.roleId = ?`);
        params.push(roleId);
    }
    if (managerId && managerId !== "") {
        conditions.push(`Employees.managerId = ?`);
        params.push(managerId);
    }
    if (search && search !== "") {
        conditions.push(`Employees.name LIKE ?`);
        params.push(`%${search}%`);
    }
    if (gender && gender !== "") {
        conditions.push(`Employees.gender = ?`);
        params.push(gender);
    }
    if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(" AND ")}`;
    }

    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).send("Database error");
            return;
        }
        // Prepare CSV header
        const header = [
            "ID", "Employee Code", "Name", "Role", "Department", "Hire Date", "Manager", "Gender", "Birth Date", "Education"
        ];
        // Prepare CSV rows
        const csvRows = rows.map(emp => [
            emp.id,
            emp.employeeCode,
            emp.name,
            emp.roleName,
            emp.departmentName,
            emp.hireDate,
            emp.managerName || '',
            emp.gender,
            emp.birthDate,
            emp.education
        ]);
        // Convert to CSV string
        const csv = [header, ...csvRows].map(row => row.map(field => `"${(field||'').toString().replace(/"/g, '""')}"`).join(",")).join("\r\n");
        res.setHeader('Content-Type', 'text/csv; charset=UTF-8');
        res.setHeader('Content-Disposition', "attachment; filename*=UTF-8''employees.csv");
        res.send(csv);
    });
});

// Utility endpoint to reset Employees table and insert 100 test employees (only 1 CEO)
app.post("/api/employees/reset-test-data", async (req, res) => {
    // Delete all employees
    db.run("DELETE FROM Employees", [], function (err) {
        if (err) {
            res.status(500).send("Database error (delete)");
            return;
        }
        // Assumption: CEO and other roles and departments already exist in Roles and Departments tables
        db.get("SELECT id FROM Roles WHERE name = 'CEO'", [], (err, ceoRole) => {
            if (err || !ceoRole) {
                res.status(500).send("Role 'CEO' not found");
                return;
            }
            db.get("SELECT id FROM Departments LIMIT 1", [], (err, dep) => {
                if (err || !dep) {
                    res.status(500).send("No department found");
                    return;
                }
                // Insert CEO
                db.run(
                    `INSERT INTO Employees (employeeCode, name, roleId, departmentId, hireDate, managerId, gender, birthDate, education) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
                    [
                        "E001",
                        "Ali CEO",
                        ceoRole.id,
                        dep.id,
                        "2020-01-01",
                        "M",
                        "1980-01-01",
                        "PhD"
                    ],
                    function (err) {
                        if (err) {
                            res.status(500).send("Database error (insert CEO)");
                            return;
                        }
                        const ceoId = this.lastID;
                        // Now insert 99 regular employees
                        db.all("SELECT id FROM Roles WHERE name != 'CEO' LIMIT 3", [], (err, roles) => {
                            if (err || !roles || roles.length === 0) {
                                res.status(500).send("No non-CEO roles found");
                                return;
                            }
                            let employees = [];
                            for (let i = 2; i <= 100; i++) {
                                const role = roles[(i-2)%roles.length];
                                employees.push([
                                    `E${String(i).padStart(3, '0')}`,
                                    `Test Employee ${i}`,
                                    role.id,
                                    dep.id,
                                    `2021-01-${(i%28+1).toString().padStart(2,'0')}`,
                                    ceoId,
                                    i%2===0 ? "M" : "F",
                                    `199${i%10}-05-15`,
                                    i%3===0 ? "Bachelor" : (i%3===1 ? "Master" : "Diploma")
                                ]);
                            }
                            const placeholders = employees.map(()=>"(?, ?, ?, ?, ?, ?, ?, ?, ?)").join(",");
                            const flat = employees.flat();
                            db.run(
                                `INSERT INTO Employees (employeeCode, name, roleId, departmentId, hireDate, managerId, gender, birthDate, education) VALUES ${placeholders}`,
                                flat,
                                function (err) {
                                    if (err) {
                                        res.status(500).send("Database error (insert employees): " + err.message);
                                    } else {
                                        res.json({ success: true, total: 100 });
                                    }
                                }
                            );
                        });
                    }
                );
            });
        });
    });
});

// GET endpoint for test: reset Employees table and insert 100 test employees (only 1 CEO)
app.get("/api/employees/reset-test-data-test", async (req, res) => {
    db.run("DELETE FROM Employees", [], function (err) {
        if (err) {
            res.status(500).send("Database error (delete)");
            return;
        }
        db.all("SELECT id, name FROM Roles", [], (err, allRoles) => {
            if (err || !allRoles || allRoles.length === 0) {
                res.status(500).send("No roles found");
                return;
            }
            const ceoRole = allRoles.find(r => r.name === 'CEO');
            if (!ceoRole) {
                res.status(500).send("Role 'CEO' not found");
                return;
            }
            db.all("SELECT id, name FROM Departments", [], (err, departments) => {
                if (err || !departments || departments.length === 0) {
                    res.status(500).send("No departments found");
                    return;
                }
                // Only English names
                const firstNames = ["David", "Emma", "John", "Sophia", "Daniel", "Olivia", "Michael", "Emily", "James", "Hannah", "William", "Mia", "Benjamin", "Charlotte", "Lucas", "Amelia", "Henry", "Ella", "Jack", "Grace", "Liam", "Ava", "Noah", "Isabella", "Mason", "Chloe", "Ethan", "Zoe", "Logan", "Lily", "Jacob", "Madison", "Elijah", "Abigail", "Alexander", "Sofia", "Matthew", "Scarlett", "Jackson", "Victoria"];
                const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Martinez", "Wilson", "Anderson", "Taylor", "Thomas", "Moore", "Martin", "Lee", "Perez", "Thompson", "White", "Harris", "Clark", "Lewis", "Robinson", "Walker", "Young", "Allen", "King", "Wright", "Scott", "Green", "Baker", "Adams", "Nelson", "Hill", "Carter", "Mitchell", "Campbell", "Roberts", "Evans", "Turner", "Parker"];
                // CEO
                db.run(
                        'INSERT INTO Employees (employeeCode, name, roleId, departmentId, hireDate, managerId, gender, birthDate, education) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [
                            "E001",
                            "Dr. David Smith",
                            ceoRole.id,
                            departments[0].id,
                            "2020-01-01",
                            null,
                            "M",
                            "1975-01-01",
                            "PhD"
                        ],
                        function (err) {
                            if (err) {
                                res.status(500).send("Database error (insert CEO)");
                                return;
                            }
                            const ceoId = this.lastID;
                            // Only non-CEO roles
                            const nonCeoRoles = allRoles.filter(r => r.name !== 'CEO');
                            let employees = [];
                            for (let i = 2; i <= 100; i++) {
                                // Random English name
                                const fname = firstNames[Math.floor(Math.random()*firstNames.length)];
                                const lname = lastNames[Math.floor(Math.random()*lastNames.length)];
                                // Random role and department
                                const role = nonCeoRoles[(i-2)%nonCeoRoles.length];
                                const dep = departments[(i-2)%departments.length];
                                employees.push([
                                    `E${String(i).padStart(3, '0')}`,
                                    `${fname} ${lname}`,
                                    role.id,
                                    dep.id,
                                    `2021-01-${(i%28+1).toString().padStart(2,'0')}`,
                                    ceoId,
                                    i%2===0 ? "M" : "F",
                                    `199${i%10}-05-15`,
                                    i%3===0 ? "Bachelor" : (i%3===1 ? "Master" : "Diploma")
                                ]);
                            }
                            const placeholders = employees.map(()=>"(?, ?, ?, ?, ?, ?, ?, ?, ?)").join(",");
                            const flat = employees.flat();
                            db.run(
                                `INSERT INTO Employees (employeeCode, name, roleId, departmentId, hireDate, managerId, gender, birthDate, education) VALUES ${placeholders}`,
                                flat,
                                function (err) {
                                    if (err) {
                                        res.status(500).send("Database error (insert employees): " + err.message);
                                    } else {
                                        res.json({ success: true, total: 100 });
                                    }
                                }
                            );
                        }
                    );
            });
        });
    });
});

// Utility endpoint to delete all family members
app.post("/api/family/reset-all", async (req, res) => {
    db.run("DELETE FROM FamilyMembers", [], function (err) {
        if (err) {
            res.status(500).send("Database error (delete family members)");
        } else {
            res.json({ success: true });
        }
    });
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;