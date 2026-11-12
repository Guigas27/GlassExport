module.exports = {
  port: Number(process.env.PORT || 3000),
  adminUser: process.env.ADMIN_USER || "admin",
  adminPassword: process.env.ADMIN_PASSWORD || "troque-esta-senha",
  // Para ativar MySQL, defina DB_HOST, DB_USER, DB_PASSWORD e DB_NAME.
  mysql: {
    host: process.env.DB_HOST || "",
    user: process.env.DB_USER || "",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || ""
  },
  dataDir: process.env.DATA_DIR || "./data"
};