/**
 * @module providers/prisma/prismaDataProvider
 * @description Prisma implementation of the DataProvider interface
 */

import { Injectable, OnModuleInit, Type } from "@nestjs/common";
import {DataProvider, QueryFilterOptions, QueryOptions} from "../../internalTypes";
import { AppAbilityType } from "@eleven-am/authorizer";
import { Action } from "@eleven-am/authorizer";
import { accessibleBy } from "@casl/prisma";
import { PrismaClient } from "@prisma/client";
import { ModuleRef } from "@nestjs/core";
import {firstLetterUppercase} from "../../decorators";


export function PrismaDataProvider (Service: Type<PrismaClient>): Type<DataProvider> {
    /**
     * Prisma implementation of the DataProvider interface
     * Handles CRUD operations using Prisma
     */
    @Injectable()
    class PrismaDataProvider implements DataProvider, OnModuleInit {
        private prisma: PrismaClient;

        constructor(private readonly moduleRef: ModuleRef){}

        onModuleInit() {
            this.prisma = this.moduleRef.get(Service, { strict: false });
        }

        /**
         * Find a single entity by criteria
         */
        async findOne<EntityType, WhereInputType>(
            modelName: string,
            ability: AppAbilityType,
            where: WhereInputType,
            select: Record<string, boolean>
        ): Promise<EntityType | null> {
            return this.prisma[modelName].findFirst(this.buildArgs(ability, Action.Read, modelName, where, select));
        }

        /**
         * Find multiple entities matching criteria
         */
        async findMany<EntityType, WhereInputType>(
            modelName: string,
            ability: AppAbilityType,
            args: QueryOptions<WhereInputType>,
            select: Record<string, boolean>
        ): Promise<EntityType[]> {
            const { pagination, where } = args;

            return this.prisma[modelName].findMany({
                take: pagination?.take,
                skip: pagination?.skip,
                where: this.buildWhereArgs(ability, Action.Read, modelName, where || {} as WhereInputType).where,
                select,
            });
        }

        /**
         * Create a new entity
         */
        async create<EntityType, CreateInputType>(
            modelName: string,
            data: CreateInputType,
            select: Record<string, boolean>
        ): Promise<EntityType> {
            return this.prisma[modelName].create({ data, select });
        }

        /**
         * Update a single entity by ID
         */
        async update<EntityType, UpdateInputType>(
            modelName: string,
            ability: AppAbilityType,
            data: UpdateInputType,
            whereId: string,
            select: Record<string, boolean>
        ): Promise<EntityType> {
            return this.prisma[modelName].update(this.buildUpdateArgs(ability, Action.Update, modelName, data, whereId, select));
        }

        /**
         * Update multiple entities matching criteria
         */
        async updateMany<EntityType, UpdateInputType, WhereInputType>(
            modelName: string,
            ability: AppAbilityType,
            data: UpdateInputType,
            where: WhereInputType,
            select: Record<string, boolean>
        ): Promise<EntityType[]> {
            const entitiesToUpdate = await this.prisma[modelName].findMany(
                this.buildArgs(ability, Action.Update, modelName, where, select)
            );

            await this.prisma[modelName].updateMany(this.buildUpdateArgs(ability, Action.Update, modelName, data, where, {}));
            return entitiesToUpdate;
        }

        /**
         * Delete a single entity by ID
         */
        async delete<EntityType>(
            modelName: string,
            ability: AppAbilityType,
            whereId: string,
            select: Record<string, boolean>
        ): Promise<EntityType> {
            return this.prisma[modelName].delete(this.buildArgs(ability, Action.Delete, modelName, whereId, select));
        }

        /**
         * Delete multiple entities matching criteria
         */
        async deleteMany<EntityType, WhereInputType>(
            modelName: string,
            ability: AppAbilityType,
            where: WhereInputType,
            select: Record<string, boolean>
        ): Promise<EntityType[]> {
            const entitiesToDelete = await this.prisma[modelName].findMany(
                this.buildArgs(ability, Action.Delete, modelName, where, select)
            );

            await this.prisma[modelName].deleteMany(this.buildArgs(ability, Action.Delete, modelName, where, {}));
            return entitiesToDelete;
        }

        /**
         * Find multiple entities without authorization
         */
        findManyWithoutAbility<EntityType, WhereInputType>(
            modelName: string,
            { where }: QueryFilterOptions<WhereInputType>,
            select: Record<string, boolean>
        ): Promise<EntityType[]> {
            return this.prisma[modelName].findMany({
                where,
                select,
            })
        }

        /**
         * Build query arguments with authorization
         *
         * @private
         * @param {AppAbilityType} ability - The user's ability for authorization
         * @param {Action} action - The action being performed
         * @param {string} modelName - The name of the model
         * @param {any} where - Filter criteria
         * @param {any} select - Fields to select
         * @returns {any} The built query arguments
         */
        private buildArgs(ability: AppAbilityType, action: Action, modelName: string, where: any, select: any): any {
            return {
                where: this.buildWhereArgs(ability, action, modelName, where).where,
                select,
            }
        }

        /**
         * Build update query arguments with authorization
         *
         * @private
         * @param {AppAbilityType} ability - The user's ability for authorization
         * @param {Action} action - The action being performed
         * @param {string} modelName - The name of the model
         * @param {any} data - The data to update
         * @param {any} where - Filter criteria
         * @param {any} select - Fields to select
         * @returns {any} The built update query arguments
         */
        private buildUpdateArgs(ability: AppAbilityType, action: Action, modelName: string,  data: any, where: any, select: any): any {
            return {
                where: this.buildWhereArgs(ability, action, modelName, where).where,
                select,
                data,
            }
        }

        /**
         * Build where clause with authorization
         *
         * @private
         * @param {AppAbilityType} ability - The user's ability for authorization
         * @param {Action} action - The action being performed
         * @param {string} modelName - The name of the model
         * @param {any} where - Filter criteria
         * @returns {{ where: object }} The built where clause
         */
        private buildWhereArgs(ability: AppAbilityType, action: Action, modelName: string, where?: any): { where: object } {
            if (typeof where === 'string') {
                return {
                    where: {
                        id: where,
                        AND: [accessibleBy(ability, action)[firstLetterUppercase(modelName)]]
                    }
                };
            }

            return {
                where: {
                    AND: [
                        accessibleBy(ability, action)[firstLetterUppercase(modelName)],
                        where,
                    ]
                }
            };
        }
    }

    return PrismaDataProvider;
}
