CREATE TABLE IF NOT EXISTS bids (
    bid_id SERIAL PRIMARY KEY,
    project_name VARCHAR(255) NOT NULL,
    client_name VARCHAR(255),
    category VARCHAR(100),
    bid_value NUMERIC(12,2),
    deadline DATE,
    status VARCHAR(50),
    source VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);