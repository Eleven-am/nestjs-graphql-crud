/**
 * @module createOneToOneResolver
 * @description Creates a resolver for one-to-one relationships
 */

import {IResolver, OneToOneRelationResolverConfig} from "./internalTypes";
import {Info, Parent, ResolveField, Resolver} from "@nestjs/graphql";
import {firstLetterUppercase} from "./decorators";
import {AppAbilityType, CurrentAbility} from "@eleven-am/authorizer";
import {Type} from "@nestjs/common";
import {GraphQLResolveInfo} from "graphql";

/**
 * Creates a resolver class for one-to-one relationships
 *
 * @template Item - The parent entity type
 * @template Target - The related entity type
 *
 * @param {string} modelName - The name of the model
 * @param {Type<Item>} item - The parent entity class
 * @param {Constructor<IGenericCrudService<Item, Target, never>>} ParentClass - The parent resolver class to extend
 * @param {OneToOneRelationResolverConfig<Item, Target>} config - Configuration for the one-to-one relationship
 * @returns {Constructor<IGenericCrudService<Item, Target, never>>} The extended resolver class
 */
export function createOneToOneResolver<Item, Target>(
    modelName: string,
    item: Type<Item>,
    config: OneToOneRelationResolverConfig<Item, Target>,
    ParentClass: Type<IResolver<any, any, any, any, any, any, any>>
): Type<IResolver<any, any, any, any, any, any, any>> {
    const resolveMethodName = `resolve${firstLetterUppercase(config.fieldName)}`;

    @Resolver(() => item)
    class OneToOneResolver extends ParentClass {
        /**
         * Resolver method for a one-to-one relationship field
         *
         * @param {Item} item - The parent entity instance
         * @param {GraphQLResolveInfo} info - The GraphQL resolve info
         * @param {AppAbilityType} ability - The user's ability for authorization
         * @returns {Promise<Target | null>} The related entity or null
         */
        @ResolveField(config.fieldName, () => config.targetType, {
            nullable: config.nullable,
        })
        async [resolveMethodName](
            @Parent() item: Item,
            @Info() info: GraphQLResolveInfo,
            @CurrentAbility.HTTP() ability: AppAbilityType,
        ): Promise<Target | null> {
            const select = this.service.fieldSelectionProvider.parseSelection<Target>(info);
            const targetId = item[config.relationField] as unknown as string;
            return this.service.resolveOneToOne(ability, config.targetModel, targetId, select);
        }
    }

    Object.defineProperty(OneToOneResolver, 'name', {
        value: `${firstLetterUppercase(modelName)}RelationsResolver`,
        writable: false,
    });

    return OneToOneResolver as Type<IResolver<any, any, any, any, any, any, any>>;
}
