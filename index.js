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

// API to get all employees with filter and pagination
app.get("/api/employees", (req, res) => {
    const {
        page = 1,
        limit = 10,
        departmentId,
        roleId,
        managerId,
        search,
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

// API برای حذف کارمند
app.delete("/api/employees/:id", (req, res) => {
    const id = req.params.id;
    // قبل از حذف، managerId کارمندی که به این کارمند گزارش می‌دن رو null کنیم
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

// API برای دریافت داده‌های چارت سازمانی
app.get("/api/orgchart", (req, res) => {
    db.all(
        `SELECT Employees.id, Employees.name, Employees.roleId, Roles.name AS roleName, Employees.managerId
         FROM Employees 
         JOIN Roles ON Employees.roleId = Roles.id`,
        [],
        (err, rows) => {
            if (err) {
                console.error("Database error in /api/orgchart:", err);
                res.status(500).send("Database error: " + err.message);
                return;
            }
            if (!rows || rows.length === 0) {
                res.status(404).send("No employees found");
                return;
            }
            // تبدیل داده‌ها به فرمت مناسب برای OrgChart.js
            const nodes = rows.map((employee) => ({
                id: employee.id,
                name: employee.name,
                title: employee.roleName,
                parentId: employee.managerId,
            }));
            console.log("OrgChart data:", nodes); // برای دیباگ
            res.json(nodes);
        },
    );
});

// API برای دریافت همه روابط
app.get("/api/relationships", (req, res) => {
    db.all("SELECT * FROM Relationships", [], (err, rows) => {
        if (err) {
            res.status(500).send("Database error");
        } else {
            res.json(rows);
        }
    });
});

// API برای اضافه کردن رابطه
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

// API برای ویرایش رابطه
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

// API برای حذف رابطه
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

// API برای دریافت همه اعضای خانواده
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

// API برای اضافه کردن عضو خانواده
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

// API برای ویرایش عضو خانواده
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

// API برای حذف عضو خانواده
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

// مسیر برای صفحه اصلی
// API برای داده‌های داشبورد تحلیلی
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

            // محاسبه سن
            if (row.birthDate) {
                const age = new Date().getFullYear() - new Date(row.birthDate).getFullYear();
                totalAge += age * row.count;

                // گروه‌بندی سنی
                const ageGroup = Math.floor(age / 5) * 5;
                const ageGroupLabel = `${ageGroup}-${ageGroup + 4}`;
                analytics.ageDistribution[ageGroupLabel] = (analytics.ageDistribution[ageGroupLabel] || 0) + row.count;
            }

            // توزیع جنسیتی
            if (row.gender === 'M') {
                analytics.genderDistribution.male += row.count;
            } else if (row.gender === 'F') {
                analytics.genderDistribution.female += row.count;
            }

            // توزیع تحصیلات
            if (row.education) {
                analytics.educationDistribution[row.education] = (analytics.educationDistribution[row.education] || 0) + row.count;
            }

            // توزیع دپارتمانی
            if (row.departmentId) {
                analytics.departmentDistribution[row.departmentId] = (analytics.departmentDistribution[row.departmentId] || 0) + row.count;
            }
        });

        analytics.totalEmployees = totalEmployees;
        analytics.averageAge = totalEmployees > 0 ? totalAge / totalEmployees : 0;

        // تبدیل نسبت‌های جنسیتی
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

// صفحه اصلی (داشبورد) فقط برای کاربران لاگین شده
app.get('/', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// مسیر برای صفحه کارکنان
app.get("/employees", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "employees.html"));
});

// مسیر برای صفحه اعضای خانواده
app.get("/family", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "family.html"));
});

// مسیر برای صفحه تنظیمات
app.get("/settings", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "settings.html"));
});

// مسیر برای صفحه چارت سازمانی
app.get("/orgchart", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "orgchart.html"));
});

// Profile page route
app.get("/profile", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "profile.html"));
});

// API برای دریافت کاربر جاری
app.get('/api/current-user', (req, res) => {
    if (req.session && req.session.user) {
        res.json({ username: req.session.user.username });
    } else {
        res.json({ username: null });
    }
});

// راه‌اندازی سرور
app.listen(3000, () => {
    console.log("Server running on port 3000");
});