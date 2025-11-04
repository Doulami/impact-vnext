-- Create databases for Strapi and Vendure
CREATE DATABASE strapi_impact;
CREATE DATABASE vendure_impact;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE strapi_impact TO impact_user;
GRANT ALL PRIVILEGES ON DATABASE vendure_impact TO impact_user;