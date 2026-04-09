CREATE TABLE upload_file (
  id VARCHAR(36) PRIMARY KEY,
  storage_key VARCHAR(255) NOT NULL UNIQUE,
  original_filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  byte_size BIGINT NOT NULL CHECK (byte_size >= 0),
  sha256_hash CHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_upload_file_sha256_hash CHECK (sha256_hash REGEXP '^[0-9a-f]{64}$')
);

CREATE TABLE project (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,
  summary TEXT NOT NULL,
  description TEXT NOT NULL,
  cover_upload_file_id VARCHAR(36) NULL,
  status VARCHAR(20) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_project_cover_upload FOREIGN KEY (cover_upload_file_id) REFERENCES upload_file(id),
  CONSTRAINT chk_project_status CHECK (status IN ('draft', 'published'))
);

CREATE TABLE project_tag (
  project_id VARCHAR(36) NOT NULL,
  tag VARCHAR(100) NOT NULL,
  PRIMARY KEY (project_id, tag),
  CONSTRAINT fk_project_tag_project FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE
);

CREATE TABLE location (
  id VARCHAR(36) PRIMARY KEY,
  project_id VARCHAR(36) NOT NULL,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  latitude DECIMAL(9, 6) NOT NULL,
  longitude DECIMAL(9, 6) NOT NULL,
  address_text VARCHAR(255) NOT NULL,
  visit_order INTEGER,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_location_project_slug (project_id, slug),
  KEY idx_location_project_id (project_id),
  CONSTRAINT fk_location_project FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE,
  CONSTRAINT chk_location_latitude CHECK (latitude BETWEEN -90 AND 90),
  CONSTRAINT chk_location_longitude CHECK (longitude BETWEEN -180 AND 180),
  CONSTRAINT chk_location_visit_order CHECK (visit_order IS NULL OR visit_order >= 0)
);

CREATE TABLE media_set (
  id VARCHAR(36) PRIMARY KEY,
  project_id VARCHAR(36) NOT NULL,
  location_id VARCHAR(36) NULL,
  type VARCHAR(20) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  cover_upload_file_id VARCHAR(36) NULL,
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_media_set_project_id (project_id),
  KEY idx_media_set_location_id (location_id),
  CONSTRAINT fk_media_set_project FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE,
  CONSTRAINT fk_media_set_location FOREIGN KEY (location_id) REFERENCES location(id) ON DELETE SET NULL,
  CONSTRAINT fk_media_set_cover_upload FOREIGN KEY (cover_upload_file_id) REFERENCES upload_file(id),
  CONSTRAINT chk_media_set_type CHECK (type IN ('spin360', 'gallery'))
);

CREATE TABLE media_image (
  id VARCHAR(36) PRIMARY KEY,
  media_set_id VARCHAR(36) NOT NULL,
  upload_file_id VARCHAR(36) NOT NULL,
  alt_text VARCHAR(255) NOT NULL,
  caption TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  latitude DECIMAL(9, 6) NULL,
  longitude DECIMAL(9, 6) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_media_image_media_set_order (media_set_id, sort_order),
  KEY idx_media_image_upload_file_id (upload_file_id),
  CONSTRAINT fk_media_image_media_set FOREIGN KEY (media_set_id) REFERENCES media_set(id) ON DELETE CASCADE,
  CONSTRAINT fk_media_image_upload_file FOREIGN KEY (upload_file_id) REFERENCES upload_file(id),
  CONSTRAINT chk_media_image_sort_order CHECK (sort_order >= 0),
  CONSTRAINT chk_media_image_latitude CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  CONSTRAINT chk_media_image_longitude CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180)
);

CREATE TABLE route (
  id VARCHAR(36) PRIMARY KEY,
  project_id VARCHAR(36) NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  line_style VARCHAR(20) NOT NULL,
  color VARCHAR(20) NOT NULL,
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_route_project_id (project_id),
  CONSTRAINT fk_route_project FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE,
  CONSTRAINT chk_route_line_style CHECK (line_style IN ('solid', 'dashed'))
);

CREATE TABLE route_location (
  route_id VARCHAR(36) NOT NULL,
  location_id VARCHAR(36) NOT NULL,
  sort_order INTEGER NOT NULL,
  PRIMARY KEY (route_id, location_id),
  UNIQUE KEY uq_route_location_sort (route_id, sort_order),
  KEY idx_route_location_location_id (location_id),
  CONSTRAINT fk_route_location_route FOREIGN KEY (route_id) REFERENCES route(id) ON DELETE CASCADE,
  CONSTRAINT fk_route_location_location FOREIGN KEY (location_id) REFERENCES location(id) ON DELETE CASCADE,
  CONSTRAINT chk_route_location_sort_order CHECK (sort_order >= 0)
);
