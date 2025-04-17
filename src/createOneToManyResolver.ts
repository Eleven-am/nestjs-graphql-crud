/**
 * @module createOneToManyResolver
 * @description Creates a resolver for one-to-many relationships
 */

import { Constructor, FindManyContract, IResolverClass, OneToManyRelationResolverConfig } from "./internalTypes";
import { Args, Info, Parent, ResolveField, Resolver } from "@nestjs/graphql";
import { firstLetterUppercase } from "./decorators";
import { AppAbilityType, CurrentAbility } from "@eleven-am/authorizer";
import { Type } from "@nestjs/common";
import { GraphQLResolveInfo } from "graphql";

/**
 * Creates a resolver class for one-to-many relationships
 *
 * @template Item - The parent entity type
 * @template Target - The related entity type
 * @template WhereInput - The input type for query filters
 *
 * @param {string} modelName - The name of the Prisma model
 * @param {Type<Item>} item - The parent entity class
 * @param {Constructor<IResolverClass<Item, Target, WhereInput>>} ParentClass - The parent resolver class to extend
 * @param {OneToManyRelationResolverConfig<Target, WhereInput>} config - Configuration for the one-to-many relationship
 * @returns {Constructor<IResolverClass<Item, Target, WhereInput>>} The extended resolver class
 */
export function createOneToManyResolver<Item, Target, WhereInput>(
    modelName: string,
    item: Type<Item>,
    ParentClass: Constructor<IResolverClass<Item, Target, WhereInput>>,
    config: OneToManyRelationResolverConfig<Target, WhereInput>
): Constructor<IResolverClass<Item, Target, WhereInput>> {
    const resolveMethodName = `resolve${firstLetterUppercase(config.fieldName)}`;

    // Create a resolver with where input parameter if targetWhereInput is provided
    if (config.targetWhereInput) {
        // @ts-ignore
        @Resolver(() => item)
        // @ts-ignore
        class OneToManyResolver extends ParentClass<Target> {
            /**
             * Resolver method for a one-to-many relationship field with filtering
             *
             * @param {Item} item - The parent entity instance
             * @param {GraphQLResolveInfo} info - The GraphQL resolve info
             * @param {AppAbilityType} ability - The user's ability for authorization
             * @param {FindManyContract<WhereInput>} where - Filter criteria
             * @returns {Promise<Target[]>} Array of related entities
             */
            @ResolveField(config.fieldName, () => [config.targetType])
            async [resolveMethodName](
                @Parent() item: Item,
                @Info() info: GraphQLResolveInfo,
                @CurrentAbility.HTTP() ability: AppAbilityType,
                @Args('filter', {
                    type: () => config.targetWhereInput,
                    nullable: config.whereNullable
                }) where?: FindManyContract<WhereInput>
            ): Promise<Target[]> {
                // @ts-ignore
                // Convert GraphQL field selection to the appropriate format for data provider
                const select = this.fieldSelectionProvider.parseSelection<Target>(info);

                // @ts-ignore
                return this.resolveOneToMany(ability, config.targetModel, config.relationField, (item as any).id, select, where);
            }
        }

        // Give the dynamic class a descriptive name for easier debugging
        Object.defineProperty(OneToManyResolver, 'name', {
            value: `${firstLetterUppercase(modelName)}RelationsResolver`,
            writable: false,
        });

        return OneToManyResolver as Constructor<IResolverClass<Item, Target, WhereInput>>;
    } else {
        // Create a resolver without where input parameter if targetWhereInput is not provided
        // @ts-ignore
        @Resolver(() => item)
        // @ts-ignore
        class OneToManyResolver extends ParentClass<Target> {
            /**
             * Resolver method for a one-to-many relationship field without filtering
             *
             * @param {Item} item - The parent entity instance
             * @param {GraphQLResolveInfo} info - The GraphQL resolve info
             * @param {AppAbilityType} ability - The user's ability for authorization
             * @returns {Promise<Target[]>} Array of related entities
             */
            @ResolveField(config.fieldName, () => [config.targetType])
            async [resolveMethodName](
                @Parent() item: Item,
                @Info() info: GraphQLResolveInfo,
                @CurrentAbility.HTTP() ability: AppAbilityType,
            ): Promise<Target[]> {
                // @ts-ignore
                // Convert GraphQL field selection to the appropriate format for data provider
                const select = this.fieldSelectionProvider.parseSelection<Target>(info);

                // @ts-ignore
                return this.resolveOneToMany(ability, config.targetModel, config.relationField, (item as any).id, select, undefined);
            }
        }

        // Give the dynamic class a descriptive name for easier debugging
        Object.defineProperty(OneToManyResolver, 'name', {
            value: `${firstLetterUppercase(modelName)}RelationsResolver`,
            writable: false,
        });

        return OneToManyResolver as Constructor<IResolverClass<Item, Target, WhereInput>>;
    }
}