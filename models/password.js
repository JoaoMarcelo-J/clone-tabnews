import bcryptjs from "bcryptjs";

async function hash(password) {
  const rounds = getNumberOfRounds();
  return await bcryptjs.hash(process.env.PEPPER + password, rounds);
}

function getNumberOfRounds() {
  return process.env.NODE_ENV === "production" ? 14 : 1;
}

async function compare(providedPassword, storedPassword) {
  return await bcryptjs.compare(
    process.env.PEPPER + providedPassword,
    storedPassword,
  );
}

const password = {
  hash,
  compare,
};

export default password;
