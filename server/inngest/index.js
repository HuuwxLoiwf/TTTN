import { Inngest } from "inngest";
import prisma from "../configs/prisma.js";

export const inngest = new Inngest({ id: "project-management" });

// Sync user creation
const syncUserCreation = inngest.createFunction(
    {
        id: "sync/user-creation",
        triggers: [{ event: "clerk/user.created" }]
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

// Sync workspace creation
const syncWorkspaceCreation = inngest.createFunction(
    {
        id: "sync/workspace-creation",
        triggers: [{ event: "clerk/organization.created" }]
    },
    async ({ event }) => {
        const { data } = event;
        await prisma.workspace.create({
            data: {
                id: data.id,
                name: data.name,
                slug: data.slug,
                ownerId: data.created_by,
                image_url: data.image_url,
            }
        });
        await prisma.workspaceMember.create({
            data: {
                userId: data.created_by,
                workspaceId: data.id,
                role: "ADMIN",
            }
        });
    }
);

// Sync workspace update
const syncWorkspaceUpdate = inngest.createFunction(
    {
        id: "sync/workspace-update",
        triggers: [{ event: "clerk/organization.updated" }]
    },
    async ({ event }) => {
        const { data } = event;
        await prisma.workspace.update({
            where: { id: data.id },
            data: {
                name: data.name,
                slug: data.slug,
                image_url: data.image_url,
            }
        });
    }
);

// Sync workspace deletion
const syncWorkspaceDeletion = inngest.createFunction(
    {
        id: "sync/workspace-deletion",
        triggers: [{ event: "clerk/organization.deleted" }]
    },
    async ({ event }) => {
        const { data } = event;
        await prisma.workspace.delete({
            where: { id: data.id }
        });
    }
);

export const functions = [
    syncUserCreation,
    syncUserDeletion,
    syncUserUpdate,
    syncWorkspaceCreation,
    syncWorkspaceUpdate,
    syncWorkspaceDeletion,
];