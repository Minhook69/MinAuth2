function verifyAdmin(providedPassword) {
  return providedPassword === process.env.ADMIN_PASSWORD;
}

module.exports = { verifyAdmin };
