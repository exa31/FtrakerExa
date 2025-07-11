import users, { type User } from "~/server/model/users";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import logger from "~/server/utils/logger";

export default defineEventHandler(async (event) => {
  try {

  const runtimeConfig = useRuntimeConfig();
  const body = await readBody<{ email: string; password: string }>(event);
  const user: User | null = await users.findOne({ email: body.email });
  if (user) {
    const isUserPassword = bcrypt.compareSync(body.password, user.password);
    if (isUserPassword) {
      const token = jwt.sign(
        { email: user.email, name: user.name },
        runtimeConfig.secretJwtKey,
        { algorithm: "HS384" }
      );
      user.token.push(token);
      await user.save();
      setCookie(event, "jwt", token, {
        secure: true,
        sameSite: "strict",
      });
      setResponseStatus(event, 200);
      return {
        statusCode: 200,
        body: { message: "Success", token },
      };
    } else {
      setResponseStatus(event, 401);
      return {
        statusCode: 401,
        body: { message: "Password is incorrect" },
      };
    }
  } else {
    setResponseStatus(event, 401);
    return {
      statusCode: 401,
      body: { message: "Email or password is incorrect" },
    };
  }
  } catch (error) {
    logger.error(`Error in login handler: ${error}`);
    setResponseStatus(event, 500);
    return {
      statusCode: 500,
      body: { message: "Server error" },
    };
  }
});
