/**
 * @module createCustomResolver
 * @description Creates a custom relation resolver class for complex relation scenarios
 */

import {
    Constructor, CustomRelationResolver,
    CustomResolverConfig, FindManyContract,
    IResolverClass,
} from "./internalTypes";
import { Args, Info, Parent, ResolveField, Resolver } from "@nestjs/graphql";
import { firstLetterUppercase } from "./decorators";
import { AppAbilityType, CurrentAbility } from "@eleven-am/authorizer";
import { Type } from "@nestjs/common";
import { GraphQLResolveInfo } from "graphql";

/**
 * Creates a custom resolver class for complex relation scenarios using factory classes
 *
 * @template Item - The parent entity type
 * @template Target - The related entity type
 * @template WhereInput - The input type for query filters
 *
 * @param {string} modelName - The name of the model
 * @param {Type<Item>} item - The parent entity class
 * @param {Constructor<IResolverClass<Item, Target, WhereInput>>} ParentClass - The parent resolver class to extend
 * @param {CustomResolverConfig<Item, Target, WhereInput>} config - Configuration for the custom resolver
 * @returns {Constructor<IResolverClass<Item, Target, WhereInput>>} The extended resolver class
 */
export function createCustomResolver<Item, Target, WhereInput>(
    modelName: string,
    item: Type<Item>,
    ParentClass: Constructor<IResolverClass<Item, Target, WhereInput>>,
    config: CustomResolverConfig<Item, Target, WhereInput>
): Constructor<IResolverClass<Item, Target, WhereInput>> {
    const resolveMethodName = `resolve${firstLetterUppercase(config.fieldName)}`;

    // Create a resolver with where input parameter if targetWhereInput is provided
    if (config.targetWhereInput) {
        // @ts-ignore
        @Resolver(() => item)
        // @ts-ignore
        class CustomResolver extends ParentClass<Target> {
            /**
             * Resolver method for a custom relation field
             *
             * @param {Item} item - The parent entity instance
             * @param {GraphQLResolveInfo} info - The GraphQL resolve info
             * @param {AppAbilityType} ability - The user's ability for authorization
             * @param {FindManyContract<WhereInput>} where - Filter criteria
             * @returns {Promise<Target | Target[]>} The resolved related entity or entities
             */
            @ResolveField(config.fieldName, () => Boolean(config.isMany) ? [config.targetType] : config.targetType)
            async [resolveMethodName](
                @Parent() item: Item,
                @Info() info: GraphQLResolveInfo,
                @CurrentAbility.HTTP() ability: AppAbilityType,
                @Args('filter', {
                    type: () => config.targetWhereInput,
                    nullable: config.whereNullable
                }) where?: FindManyContract<WhereInput>
            ): Promise<Target | Target[]> {
                // @ts-ignore
                // Convert GraphQL field selection to the appropriate format for data provider
                const select = this.fieldSelectionProvider.parseSelection<Target>(info);

                // @ts-ignore
                const instance = this.getFactory(config.factoryClass) as unknown as CustomRelationResolver<Item, Target, WhereInput>;
                return instance.resolve(ability, item, select, where);
            }
        }

        // Give the dynamic class a descriptive name for easier debugging
        Object.defineProperty(CustomResolver, 'name', {
            value: `${firstLetterUppercase(modelName)}RelationsResolver`,
            writable: false,
        });

        return CustomResolver as Constructor<IResolverClass<Item, Target, WhereInput>>;
    } else {
        // Create a resolver without where input parameter if targetWhereInput is not provided
        // @ts-ignore
        @Resolver(() => item)
            // @ts-ignore
        class CustomResolver extends ParentClass<Target> {
            /**
             * Resolver method for a custom relation field without filtering
             *
             * @param {Item} item - The parent entity instance
             * @param {GraphQLResolveInfo} info - The GraphQL resolve info
             * @param {AppAbilityType} ability - The user's ability for authorization
             * @returns {Promise<Target | Target[]>} The resolved related entity or entities
             */
            @ResolveField(config.fieldName, () => Boolean(config.isMany) ? [config.targetType] : config.targetType)
            async [resolveMethodName](
                @Parent() item: Item,
                @Info() info: GraphQLResolveInfo,
                @CurrentAbility.HTTP() ability: AppAbilityType,
            ): Promise<Target | Target[]> {
                // @ts-ignore
                // Convert GraphQL field selection to the appropriate format for data provider
                const select = this.fieldSelectionProvider.parseSelection<Target>(info);

                // @ts-ignore
                const instance = this.getFactory(config.factoryClass) as unknown as CustomRelationResolver<Item, Target, WhereInput>;
                return instance.resolve(ability, item, select, undefined);
            }
        }

        // Give the dynamic class a descriptive name for easier debugging
        Object.defineProperty(CustomResolver, 'name', {
            value: `${firstLetterUppercase(modelName)}RelationsResolver`,
            writable: false,
        });

        return CustomResolver as Constructor<IResolverClass<Item, Target, WhereInput>>;
    }
}