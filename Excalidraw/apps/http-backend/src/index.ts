import express from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";
import { middleware } from "./middleware";
import { CreateUserSchema, SigninSchema, CreateRoomSchema } from "@repo/common/types";
import { prismaClient } from "@repo/db/clients";


const app = express();
app.use(express.json());
app.listen(3001);


app.post("/signup", async (req, res) => {

    const parseData = CreateUserSchema.safeParse(req.body);
    if(!parseData.success) {
        res.json({
            message: "Incorrect inputs"
        })
        return;
    }
    try {
        const user = await prismaClient.user.create({
            data: {
                email: parseData.data?.username,
                password: parseData.data.password,
                name: parseData.data.name
            }
        })

        res.json({
        userId: user.id
        })


    } catch(e) {
        res.status(411).json({
            message: "User already exists with this username"
        })
    }

    

})


app.post("/signin", async (req,res) => {
    const parseData = SigninSchema.safeParse(req.body);
    if(!parseData.success) {
        res.json({
            message: "Incorrect inputs"
        })
        return;
    }

    const user = await prismaClient.user.findFirst({
        where: {
            email: parseData.data.username,
            password: parseData.data.password
        }
    })

    if (!user) {
        res.status(403).json({
            message: "Not authorized"
        })
        return;
    }

    const token = jwt.sign({
        userId: user?.id
    }, JWT_SECRET);

    res.json({
        token
    })

})


app.post("/room", middleware, async (req,res) => {
    const parseData = CreateRoomSchema.safeParse(req.body);
    if(!parseData.success) {
        res.json({
            message: "Incorrect inputs"
        })
        return;
    }
    //@ts-ignore
    const userId = req.userId;

    try {
        const room = await prismaClient.room.create({
            data: {
                slug: parseData.data.name,
                adminId: userId
            }
        })

        res.json({
            roomId: room.id
        })
    } catch(e) {
        res.status(411).json({
            message: "Room already exists with this name"
        })
    }

})

