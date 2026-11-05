-- Reference only: extracted from section 4.1. Six tables, legacy column names; not an application migration.

PRAGMA foreign_keys = ON;
 
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    role TEXT NOT NULL
        CHECK (role IN ('admin', 'client', 'master')),
    address TEXT,
    password_hash TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1
        CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
 
CREATE TABLE IF NOT EXISTS masters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    experience_years INTEGER NOT NULL DEFAULT 0
        CHECK (experience_years >= 0),
    service_area TEXT,
    max_daily_requests INTEGER NOT NULL DEFAULT 5
        CHECK (max_daily_requests > 0),
    rating REAL NOT NULL DEFAULT 0
        CHECK (rating >= 0 AND rating <= 5),
    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);
 
CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    equipment_category TEXT NOT NULL,
    base_price REAL NOT NULL
        CHECK (base_price >= 0),
    average_duration_minutes INTEGER NOT NULL
        CHECK (average_duration_minutes > 0),
    required_skill_level INTEGER NOT NULL DEFAULT 1
        CHECK (required_skill_level > 0),
    is_active INTEGER NOT NULL DEFAULT 1
        CHECK (is_active IN (0, 1))
);
 
CREATE TABLE IF NOT EXISTS parts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sku TEXT NOT NULL UNIQUE,
    description TEXT,
    unit_price REAL NOT NULL
        CHECK (unit_price >= 0),
    is_active INTEGER NOT NULL DEFAULT 1
        CHECK (is_active IN (0, 1))
);
 
CREATE TABLE IF NOT EXISTS service_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1
        CHECK (is_active IN (0, 1))
);
 
CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    master_id INTEGER,
    service_mode TEXT NOT NULL
        CHECK (service_mode IN ('onsite', 'dropoff')),
    service_point_id INTEGER,
    address TEXT,
    desired_datetime TEXT,
    issue_description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new'
        CHECK (status IN (
            'new', 'confirmed', 'assigned', 'in_progress',
            'waiting_parts', 'ready_for_pickup', 'completed',
            'closed', 'cancelled', 'rejected'
        )),
    total_price REAL NOT NULL DEFAULT 0
        CHECK (total_price >= 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)
        REFERENCES users(id),
    FOREIGN KEY (service_id)
        REFERENCES services(id),
    FOREIGN KEY (master_id)
        REFERENCES masters(id)
        ON DELETE SET NULL,
    FOREIGN KEY (service_point_id)
        REFERENCES service_points(id)
);

