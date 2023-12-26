import {schema as joi_schema} from './schema';
import express, {Express} from "express";
import {default as nedb} from "@seald-io/nedb";
import path from "path";

export const app: Express = express();
export const db = new nedb({
    filename: path.resolve('./store.jsonl'),
    autoload: true,
    async onload(error: Error | null): Promise<any> {
        await db.ensureIndexAsync({unique: true, fieldName: 'email'});
        await db.ensureIndexAsync({unique: true, fieldName: 'phone'});
    }
});
export const schema = joi_schema;

export type RecordType = {
    name: string,
    phone: string,
    email: string,
    country: string,
    state: string,
    city: string,
    created: Date,
    updated: Date,
}