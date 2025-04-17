/**
 * @module createCombinedRelationResolverClass
 * @description Creates a resolver class that handles all relations for an entity
 */

import { Inject, Type } from "@nestjs/common";
import { ModuleRef } from '@nestjs/core';
import {
    Constructor,
    CustomRelationResolver,
    DataProvider,
    FieldSelectionProvider,
    FindManyContract,
    IResolverClass,
    RelationResolverConfig,
} from "./internalTypes";
import { Resolver } from '@nestjs/graphql';
import { firstLetterUppercase } from "./decorators";
import { AppAbilityType } from "@eleven-am/authorizer";
import { createCustomResolver } from "./createCustomResolver";
import { createOneToManyResolver } from "./createOneToManyResolver";
import { createOneToOneResolver } from "./createOneToOneResolver";

/**
 * Creates a combined resolver class that handles all relation types for an entity
 *
 * @template Item - The parent entity type
 * @template Target - The related entity type
 * @template WhereInput - The input type for query filters
 *
 * @param {string} modelName - The name of the model
 * @param {Type<Item>} item - The parent entity class
 * @param {symbol} dataProviderToken - Symbol for the data provider token
 * @param {symbol} fieldSelectionProviderToken - Symbol for the field selection provider token
 * @param {RelationResolverConfig<Item, Target, WhereInput>[]} relationConfigs - Array of relation configurations
 * @returns {Constructor<IResolverClass<Item, Target, WhereInput>>} A class that handles all relations
 */
export function createCombinedRelationResolverClass<Item, Target, WhereInput>(
    modelName: string,
    item: Type<Item>,
    dataProviderToken: symbol,
    fieldSelectionProviderToken: symbol,
    relationConfigs: RelationResolverConfig<Item, Target, WhereInput>[]
): Constructor<IResolverClass<Item, Target, WhereInput>> {
    @Resolver(() => item)
    class CombinedRelationResolver implements IResolverClass<Item, Target, WhereInput> {
        constructor(
            private readonly moduleRef: ModuleRef,
            @Inject(dataProviderToken) private readonly dataProvider: DataProvider,
            @Inject(fieldSelectionProviderToken) public readonly fieldSelectionProvider: FieldSelectionProvider
        ) {}

        /**
         * Get a custom relation resolver factory instance
         *
         * @template Class - The custom relation resolver type
         * @param {Type<Class>} factoryClass - The factory class
         * @returns {Class} The factory instance
         */
        getFactory<Class extends CustomRelationResolver<Item, Target, WhereInput>> (
            factoryClass: Type<Class>
        ): Class {
            return this.moduleRef.get(factoryClass, { strict: false });
        }

        /**
         * Resolve a one-to-many relation
         *
         * @param {AppAbilityType} ability - The user's ability for authorization
         * @param {string} targetModel - The name of the target model
         * @param {string} foreignKey - The foreign key field name
         * @param {string} itemId - The ID of the parent item
         * @param {any} select - Fields to select in the result
         * @param {FindManyContract<WhereInput>} [where] - Optional filter criteria
         * @returns {Promise<Target[]>} Array of related entities
         */
        resolveOneToMany(
            ability: AppAbilityType,
            targetModel: string,
            foreignKey: string,
            itemId: string,
            select: any,
            where?: FindManyContract<WhereInput>
        ): Promise<Target[]> {
            return this.dataProvider.findMany<Target, WhereInput>(
                targetModel,
                ability,
                {
                    where: {
                        ...((where?.where || {}) as WhereInput),
                        [foreignKey]: itemId
                    } as WhereInput,
                    pagination: where?.pagination
                },
                select
            );
        }

        /**
         * Resolve a one-to-one relation
         *
         * @param {AppAbilityType} ability - The user's ability for authorization
         * @param {string} targetModel - The name of the target model
         * @param {string} itemId - The ID of the related item
         * @param {any} select - Fields to select in the result
         * @returns {Promise<Target | null>} The related entity or null
         */
        resolveOneToOne(
            ability: AppAbilityType,
            targetModel: string,
            itemId: string,
            select: any
        ): Promise<Target | null> {
            if (!itemId) {
                return Promise.resolve(null);
            }

            return this.dataProvider.findOne<Target, { id: string }>(
                targetModel,
                ability,
                { id: itemId } as any,
                select
            );
        }
    }

    /**
     * Reduce over all relation configs to build the final resolver class with all relation methods
     */
    const FinalClass = relationConfigs.reduce((AccumulatorClass, config) => {
        if ('factoryClass' in config) {
            return createCustomResolver(modelName, item, AccumulatorClass, config);
        } else if ('oneToOneRelation' in config) {
            return createOneToOneResolver(modelName, item, AccumulatorClass, config);
        }

        return createOneToManyResolver(modelName, item, AccumulatorClass, config);
    }, CombinedRelationResolver);

    // Give the dynamic class a descriptive name for debugging
    Object.defineProperty(FinalClass, 'name', {
        value: `${firstLetterUppercase(modelName)}RelationsResolver`,
        writable: false,
    });

    return FinalClass;
}