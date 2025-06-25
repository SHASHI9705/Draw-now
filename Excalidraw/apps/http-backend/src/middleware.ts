import { NextFunction } from "express";
import jwt, { decode } from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config"


export function middleware(req: Request, res: Response, next: NextFunction) {
    //@ts-ignore
    const token = req.headers["authorization"];

    const decoded = jwt.verify(token, JWT_SECRET);
    //@ts-ignore
    if (decoded.userId) {
        //@ts-ignore
        req.userId = decoded.userId;
        next();

    }else {
        //@ts-ignore
        res.status(403).json({
            messgae:"Unauthorized"
        })
    }
}