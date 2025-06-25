import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config"


export function middleware(req: Request, res: Response, next: NextFunction) {
    //@ts-ignore
    const token = req.headers["authorization"] ?? "";

    const decoded = jwt.verify(token, JWT_SECRET);
    //@ts-ignore
    if (decoded) {
        //@ts-ignore
        req.userId = decoded.userId;
        next();

    }else {
        //@ts-ignore
        res.status(403).json({
            message:"Unauthorized"
        })
    }
}