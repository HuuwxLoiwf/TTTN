import { Inngest } from "inngest";
import { prisma } from "../lib/prisma.js"; // nhớ import prisma!

export const inngest = new Inngest({ id: "project-management" });

// Sync user creation
const syncUserCreation = inngest.createFunction(
    {
        id: "sync/user-creation",
        triggers: [{ event: "clerk/user.created" }]  // ✅ triggers vào argument 1
    },
    async ({ event }) => {
        const { data } = event;
        await prisma.user.create({
            data: {
                id: data.id,
                email: data?.email_addresses[0]?.email_address,
                name: data?.first_name + " " + data?.last_name,
                image: data?.image_url,
            }
        });
    }
);

// Sync user deletion
const syncUserDeletion = inngest.createFunction(
    {
        id: "delete-user-with-clerk",
        triggers: [{ event: "clerk/user.deleted" }]
    },
    async ({ event }) => {
        const { data } = event;
        await prisma.user.delete({
            where: { id: data.id }
        });
    }
);

// Sync user update
const syncUserUpdate = inngest.createFunction(
    {
        id: "update-user-with-clerk",
        triggers: [{ event: "clerk/user.updated" }]
    },
    async ({ event }) => {
        const { data } = event;
        await prisma.user.update({
            where: { id: data.id },
            data: {
                email: data?.email_addresses[0]?.email_address,
                name: data?.first_name + " " + data?.last_name,
                image: data?.image_url,
            }
        });
    }
);

export const functions = [syncUserCreation, syncUserDeletion, syncUserUpdate];