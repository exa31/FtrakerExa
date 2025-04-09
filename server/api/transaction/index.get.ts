import Users from "~/server/model/users";
import transactions from "~/server/model/transactions";
import selectedViewPeriode from "~/server/utils/selectedViewPeriode";
import jwt from "jsonwebtoken";

export default defineEventHandler(async (events) => {
  try {
    const runTimeConfig = useRuntimeConfig();
    const header = getHeader(events, "Authorization");
    const token = header?.split(" ")[1];
    if (!token) {
      setResponseStatus(events, 401);
      throw createError("Unauthorized");
    }
    const isValidToken = jwt.verify(
      token,
      runTimeConfig.secretJwtKey as string
    );
    if (!isValidToken) {
      setResponseStatus(events, 401);
      throw createError("Unauthorized");
    }
    const { view } = getQuery(events) as { view: string };
    const { lastPeriode, currentPeriode } = selectedViewPeriode(view);
    const decoded = jwt.decode(token) as { email: string; name: string };
    const usersData = await Users.findOne({ email: decoded.email });
    if (view === "All") {
      const all = await transactions
        .find({ user: usersData!._id })
        .sort({ createdAt: -1 });
      return {
        statusCode: 200,
        current: all,
        last: [],
      };
    }
    const current = await transactions
      .find({ user: usersData!._id })
      .sort({ createdAt: -1 })
      .gte("createdAt", currentPeriode().start)
      .lte("createdAt", currentPeriode().end)
      .gte("createdAt", currentPeriode().start);
    const last = await transactions
      .find({ user: usersData!._id })
      .sort({ createdAt: -1 })
      .gte("createdAt", lastPeriode().start)
      .lte("createdAt", lastPeriode().end);
    return {
      statusCode: 200,
      current,
      last,
    };
  } catch (error) {
    return;
  }
});
