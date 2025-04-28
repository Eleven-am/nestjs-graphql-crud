/**
 * @module createCombinedRelationResolverClass
 * @description Creates a resolver class that handles all relations for an entity
 */

import {Type} from "@nestjs/common";
import {CustomResolverConfig, IResolver, RelationResolverConfig, ResolverConfig,} from "./internalTypes";
import {firstLetterUppercase} from "./decorators";
import {createCustomResolver} from "./createCustomResolver";
import {createOneToManyResolver} from "./createOneToManyResolver";
import {createOneToOneResolver} from "./createOneToOneResolver";

/**
 * Creates a combined resolver class that handles all relation types for an entity
 *
 * @template Item - The parent entity type
 * @template Target - The related entity type
 * @template WhereInput - The input type for query filters
 *
 * @param {string} modelName - The name of the model
 * @param {Type<Item>} item - The parent entity class
 * @param {RelationResolverConfig<Item, Target, WhereInput>[]} relationConfigs - Array of relation configurations
 * @param {Type<IResolver<any, any, any, any, any, Target, any, any>>} ParentClass - The parent resolver class to extend
 * @returns {Constructor<IResolver<Item, Target, WhereInput>>} A class that handles all relations
 */
export function createCombinedRelationResolverClass<Item, Target, WhereInput>(
    modelName: string,
    item: Type<Item>,
    ParentClass: Type<IResolver<any, any, any, any, any, Target, any>>,
    relationConfigs?: ResolverConfig<Item, Target, WhereInput>,
): Type<IResolver<any, any, any, any, any, any, any>> {
    if (!relationConfigs) {
        return ParentClass;
    }

    const MapCustomResolver = (options: CustomResolverConfig<object> | undefined) => {
        if (!options) {
            return ParentClass;
        }

        const { customResolvers, factoryClass } = options;
        return customResolvers
            .reduce(
                (AccumulatorClass, config) => createCustomResolver(item, modelName, factoryClass, config, AccumulatorClass),
                ParentClass
            )
    }

    const MapRelationResolver = (
        config: RelationResolverConfig<Item, Target, WhereInput>[],
        ParentClass: Type<IResolver<any, any, any, any, any, Target, any>>,
    ) => config
        .reduce((AccumulatorClass, config) => {
            if ('oneToOneRelation' in config) {
                return createOneToOneResolver(modelName, item, config, AccumulatorClass);
            } else {
                return createOneToManyResolver(modelName, item, config, AccumulatorClass);
            }
        }, ParentClass);

    const FirstClass = MapCustomResolver(relationConfigs.customResolvers);
    const FinalClass = MapRelationResolver(relationConfigs.relationResolvers, FirstClass);

    Object.defineProperty(FinalClass, 'name', {
        value: `${firstLetterUppercase(modelName)}RelationsResolver`,
        writable: false,
    });

    return FinalClass;
}