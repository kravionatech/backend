import jwt from "jsonwebtoken";

export const tokenGenerate = ({
  id,
  email,
  role,
  isVerified,
  isActive,
  accessSecret,
  refreshSecret,
  accessExpiresIn = "15m",
  refreshExpiresIn = "7d",
}) => {
  const payload = {
    id,
    email,
    role,
    isVerified,
    isActive,
  };

  const accessToken = jwt.sign(payload, accessSecret, {
    expiresIn: accessExpiresIn,
  });

  const refreshToken = jwt.sign(
    { id },
    refreshSecret,
    {
      expiresIn: refreshExpiresIn,
    }
  );

  return {
    accessToken,
    refreshToken,
  };
};

export default tokenGenerate;   