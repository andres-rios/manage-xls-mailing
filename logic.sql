
CREATE TABLE IF NOT EXISTS columns
(
  id serial,
  name text,
  synonym text,
  "createdAt" timestamp without time zone DEFAULT now(),
  "updatedAt" timestamp without time zone,
  CONSTRAINT columns_pkey PRIMARY KEY (id)
)
WITH (
  OIDS=FALSE
);

CREATE TABLE IF NOT EXISTS as_is
(
  id serial NOT NULL,
  name text,
  first_name text,
  last_name text,
  email text,
  "position" text,
  company text,
  site text,
  headquarters text,
  city text,
  country text,
  linkedin_profile text,
  sales_manager text,
  company_domain text,
  company_description text,
  video_url text,
  state text,
  added_on timestamp without time zone,
  last_touch timestamp without time zone,
  session_time timestamp without time zone,
  CONSTRAINT pkey_id PRIMARY KEY (id)
)
WITH (
  OIDS=FALSE
);

CREATE TABLE IF NOT EXISTS videos
(
  id serial,
  name text,
  url text,
  CONSTRAINT pk_videos_id PRIMARY KEY (id),
  CONSTRAINT unique_videos_name UNIQUE (name)
)
WITH (
  OIDS=FALSE
);

CREATE TABLE IF NOT EXISTS names_synonyms
(
  id serial,
  name text,
  "similar" text,
  CONSTRAINT pk_names_synonyms_id PRIMARY KEY (id),
  CONSTRAINT unique_names_synonyms_name_simlar UNIQUE (name, "similar")
)
WITH (
  OIDS=FALSE
);

CREATE OR REPLACE FUNCTION normalize_first_last_names()
  RETURNS void AS
$$
BEGIN

WITH
first_names AS (
  SELECT id, substring(trim(name) from '^\w+') AS first_name
  FROM as_is),
last_names AS (
  SELECT
    as_is.id,
    trim(right(trim(name),
      length(trim(name)) - length(first_names.first_name))) AS last_name
  FROM as_is
  LEFT JOIN first_names ON first_names.id=as_is.id),
names AS (
  SELECT
    first_names.id,
    first_names.first_name AS first,
    last_names.last_name AS last
  FROM first_names
  LEFT JOIN last_names ON last_names.id=first_names.id)
UPDATE as_is
SET
  first_name=names.first,
  last_name=names.last
FROM names
WHERE as_is.id=names.id;

END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION as_is_before_insert()
  RETURNS trigger AS
$$
DECLARE
  r RECORD;
BEGIN
  IF NEW.name IS NULL OR NEW.email IS NULL THEN
    RETURN NULL;
  END IF;
  NEW.name = trim(both NEW.name);
  NEW.email = trim(both NEW.email);
  SELECT * FROM as_is INTO r WHERE name=NEW.name AND email=NEW.email;
  IF r IS NULL THEN
    RETURN NEW;
  END IF;

  IF (r.linkedin_profile IS NULL AND NEW.linkedin_profile IS NULL) THEN
  ELSE
    IF (r.linkedin_profile IS NULL AND NEW.linkedin_profile IS NOT NULL) OR
       (r.linkedin_profile != NEW.linkedin_profile) THEN
      UPDATE as_is SET linkedin_profile=NEW.linkedin_profile WHERE id=r.id;
    END IF;
  END IF;

  IF (r."position" IS NULL AND NEW."position" IS NULL) THEN
  ELSE
    IF (r."position" IS NULL AND NEW."position" IS NOT NULL) OR
       (r."position" != NEW."position") THEN
      UPDATE as_is SET "position"=NEW."position" WHERE id=r.id;
    END IF;
  END IF;

  IF (r.name IS NULL AND NEW.name IS NULL) THEN
  ELSE
    IF (r.name IS NULL AND NEW.name IS NOT NULL) OR
       (r.name != NEW.name) THEN
      UPDATE as_is SET name=NEW.name WHERE id=r.id;
    END IF;
  END IF;

  IF (r.headquarters IS NULL AND NEW.headquarters IS NULL) THEN
  ELSE
    IF (r.headquarters IS NULL AND NEW.headquarters IS NOT NULL) OR
       (r.headquarters != NEW.headquarters) THEN
      UPDATE as_is SET headquarters=NEW.headquarters WHERE id=r.id;
    END IF;
  END IF;

  IF (r.email IS NULL AND NEW.email IS NULL) THEN
  ELSE
    IF (r.email IS NULL AND NEW.email IS NOT NULL) OR
       (r.email != NEW.email) THEN
      UPDATE as_is SET email=NEW.email WHERE id=r.id;
    END IF;
  END IF;

  IF (r.company IS NULL AND NEW.company IS NULL) THEN
  ELSE
    IF (r.company IS NULL AND NEW.company IS NOT NULL) OR
       (r.company != NEW.company) THEN
      UPDATE as_is SET company=NEW.company WHERE id=r.id;
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_as_is_before_insert ON as_is CASCADE;
CREATE TRIGGER trigger_as_is_before_insert
  BEFORE INSERT
  ON as_is
  FOR EACH ROW
  EXECUTE PROCEDURE as_is_before_insert();


CREATE OR REPLACE FUNCTION columns_before_insert()
  RETURNS trigger AS
$$
DECLARE
  id_ integer;
BEGIN
  IF NEW.synonym IS NULL THEN
    RETURN NULL;
  END IF;
  NEW.synonym = trim(both NEW.synonym);
  SELECT id FROM columns INTO id_ WHERE synonym LIKE NEW.synonym;
  IF id_ IS NULL THEN
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_columns_before_insert ON columns;
CREATE TRIGGER trigger_columns_before_insert
  BEFORE INSERT
  ON columns
  FOR EACH ROW
  EXECUTE PROCEDURE columns_before_insert();

DROP VIEW IF EXISTS manage_names;
CREATE VIEW manage_names AS (
WITH
as_is_first_names AS (
  SELECT first_name AS first_name, COUNT(first_name) AS c_first_name
  FROM as_is
  WHERE NOT(first_name IS NULL OR first_name LIKE '')
  GROUP BY first_name
),
as_is_names_synonyms AS (
SELECT
  as_is_first_names.first_name,
  as_is_first_names.c_first_name,
  names_synonyms.name
FROM as_is_first_names
LEFT JOIN names_synonyms
  ON names_synonyms.similar=as_is_first_names.first_name
)
SELECT
  as_is_names_synonyms.first_name,
  as_is_names_synonyms.c_first_name,
  as_is_names_synonyms.name,
  videos.url
FROM as_is_names_synonyms
LEFT JOIN videos
  ON videos.name=as_is_names_synonyms.first_name
  OR videos.name=as_is_names_synonyms.name
);

CREATE OR REPLACE FUNCTION manage_names_instead_of_insert()
  RETURNS trigger AS
$$
BEGIN
  IF NEW.first_name IS NULL OR TRIM(NEW.first_name)='' THEN
    RETURN NULL;
  END IF;
  IF NEW.c_first_name IS NULL THEN
    RETURN NULL;
  END IF;
  IF NEW.first_name != OLD.first_name THEN
    UPDATE as_is
    SET first_name=NEW.first_name
    WHERE first_name=OLD.first_name;
  END IF;
  IF OLD.name IS NULL AND NEW.name IS NOT NULL THEN
    IF (NOT EXISTS(SELECT "similar"
        FROM names_synonyms
        WHERE "similar"=NEW.first_name)) THEN
      INSERT INTO names_synonyms(name, "similar")
      VALUES (NEW.name, NEW.first_name);
    END IF;
  ELSIF OLD.name IS NOT NULL THEN
    UPDATE names_synonyms
    SET name=NEW.name
    WHERE "similar"=NEW.first_name;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_manage_names ON manage_names CASCADE;
CREATE TRIGGER trigger_manage_names
  INSTEAD OF UPDATE
  ON manage_names
  FOR EACH ROW
  EXECUTE PROCEDURE manage_names_instead_of_insert();
