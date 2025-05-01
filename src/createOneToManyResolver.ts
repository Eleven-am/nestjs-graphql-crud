/**
 * @module createOneToManyResolver
 * @description Creates a resolver for one-to-many relationships
 */

import {
    FindManyContract,
    IResolver,
    OneToManyRelationResolverConfig
} from "./internalTypes";
import {Args, Info, Parent, ResolveField, Resolver} from "@nestjs/graphql";
import {CurrentAbility, firstLetterUppercase} from "./decorators";
import {AppAbilityType} from "@eleven-am/authorizer";
import {Type} from "@nestjs/common";
import {GraphQLResolveInfo} from "graphql";

/**
 * Creates a resolver class for one-to-many relationships
 *
 * @template Item - The parent entity type
 * @template Target - The related entity type
 * @template WhereInput - The input type for query filters
 *
 * @param {string} modelName - The name of the Prisma model
 * @param {Type<Item>} item - The parent entity class
 * @param {Constructor<IGenericCrudService<Item, Target, WhereInput>>} ParentClass - The parent resolver class to extend
 * @param {OneToManyRelationResolverConfig<Target, WhereInput>} config - Configuration for the one-to-many relationship
 * @returns {Constructor<IGenericCrudService<Item, Target, WhereInput>>} The extended resolver class
 */
export function createOneToManyResolver<Item, Target, WhereInput>(
    modelName: string,
    item: Type<Item>,
    config: OneToManyRelationResolverConfig<Target, WhereInput>,
    ParentClass: Type<IResolver<any, any, any, any, any, any, any, any>>
): Type<IResolver<any, any, any, any, any, any, any, any>> {
    const resolveMethodName = `resolve${firstLetterUppercase(config.fieldName)}`;

    if (config.targetWhereInput) {
        @Resolver(() => item)
        class OneToManyResolver extends ParentClass {
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
                const select = this.service.fieldSelectionProvider.parseSelection<Target>(info);
                return this.service.resolveOneToMany(ability, config.targetModel, config.relationField, (item as any).id, select, where);
            }
        }

        Object.defineProperty(OneToManyResolver, 'name', {
            value: `${firstLetterUppercase(modelName)}RelationsResolver`,
            writable: false,
        });

        return OneToManyResolver as Type<IResolver<any, any, any, any, any, any, any, any>>;
    } else {
        @Resolver(() => item)
        class OneToManyResolver extends ParentClass {
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
                const select = this.service.fieldSelectionProvider.parseSelection<Target>(info);
                return this.service.resolveOneToMany(ability, config.targetModel, config.relationField, (item as any).id, select, undefined);
            }
        }

        Object.defineProperty(OneToManyResolver, 'name', {
            value: `${firstLetterUppercase(modelName)}RelationsResolver`,
            writable: false,
        });

        return OneToManyResolver as Type<IResolver<any, any, any, any, any, any, any, any>>;
    }
}
