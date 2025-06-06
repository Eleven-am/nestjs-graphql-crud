/**
 * @module createBaseCrudResolver
 * @description Creates a GraphQL resolver with CRUD operations for a specific entity
 */

import {
	CreateBaseCrudResolverOptions,
	FindManyContract,
	IGenericCrudService,
	SubscriptionResolver,
	IResolver
} from "./internalTypes";
import { Args, Mutation, Query, Resolver, Subscription, Info } from "@nestjs/graphql";
import { PubSub } from "graphql-subscriptions";
import { Inject, Type } from "@nestjs/common";
import { CurrentPubSub, firstLetterUppercase } from "./decorators";
import { Action, AppAbilityType, CanPerform, CurrentAbility } from "@eleven-am/authorizer";
import { GraphQLResolveInfo } from "graphql";

/**
 * Creates a GraphQL resolver class with standard CRUD operations for a specific entity
 *
 * @template Item - The entity type this resolver will manage
 * @template CreateInput - The input type for create operations
 * @template UpdateInput - The input type for update operations
 * @template UpdateManyInput - The input type for update many operations
 * @template WhereInput - The input type for query filters
 *
 * @param {symbol} serviceToken - Symbol for the CRUD service token
 * @param {symbol} resolverToken - Symbol for the subscription resolver token
 * @param {Type} SubscriptionFilter - The filter type for subscriptions
 * @param {CreateBaseCrudResolverOptions<Item, CreateInput, UpdateInput, UpdateManyInput, WhereInput>} options - Configuration options
 * @returns {Type} A dynamically generated resolver class with CRUD operations
 */
export function createBaseCrudResolver<
	Item,
	CreateInput,
	UpdateInput,
	UpdateManyInput,
	WhereInput,
	Target,
	TargetWhereInput,
	TResolver extends object,
> (
	serviceToken: symbol,
	resolverToken: symbol,
	SubscriptionFilter: Type,
	options: CreateBaseCrudResolverOptions<
		Item,
		CreateInput,
		UpdateInput,
		UpdateManyInput,
		WhereInput
	>
): Type<IResolver<any, any, any, any, any, any, any, any>> {
	const ModelName = firstLetterUppercase(options.modelName);
	
	@Resolver(() => options.entity)
	class BaseCrudResolver<
		Item,
		CreateInput,
		UpdateInput,
		UpdateManyInput,
		WhereInput
	> {
		constructor(
			@Inject(serviceToken)
			readonly service: IGenericCrudService<
				Item,
				CreateInput,
				UpdateInput,
				UpdateManyInput,
				WhereInput,
				Target,
				TargetWhereInput,
				TResolver
			>,
			@Inject(resolverToken) private readonly resolver: SubscriptionResolver<Item, unknown>,
			@CurrentPubSub() private readonly pubSub: PubSub,
		) {}
		
		/**
		 * Query to find a single entity by criteria
		 *
		 * @param {any} ability - The user's ability for authorization
		 * @param {GraphQLResolveInfo} info - GraphQL resolve info for field selection
		 * @param {WhereInput} where - Filter criteria
		 * @returns {Promise<Item | null>} The found entity or null
		 */
		@Query(() => options.entity, {
			name: `${options.modelName}FindOne`,
			nullable: true,
		})
		@CanPerform({
			action: Action.Read,
			// @ts-ignore
			resource: ModelName
		})
		async findOne(
			@CurrentAbility.HTTP() ability: any,
			@Info() info: GraphQLResolveInfo,
			@Args('where', { type: () => options.whereInput }) where: WhereInput
		): Promise<Item | null> {
			const select = this.service.fieldSelectionProvider.parseSelection<Item>(info);
			return this.service.findOne(ability, where, select);
		}
		
		/**
		 * Query to find multiple entities matching criteria
		 *
		 * @param {any} ability - The user's ability for authorization
		 * @param {GraphQLResolveInfo} info - GraphQL resolve info for field selection
		 * @param {FindManyContract<WhereInput>} where - Filter and pagination criteria
		 * @returns {Promise<Item[]>} Array of matched entities
		 */
		@Query(() => [options.entity], {
			name: `${options.modelName}FindMany`,
		})
		@CanPerform({
			action: Action.Read,
			// @ts-ignore
			resource: ModelName
		})
		async findMany(
			@Info() info: GraphQLResolveInfo,
			@CurrentAbility.HTTP() ability: AppAbilityType,
			@Args('filter', {type: () => options.findManyArgs, nullable: true}) where?: FindManyContract<WhereInput>,
		): Promise<Item[]> {
			const select = this.service.fieldSelectionProvider.parseSelection<Item>(info);
			return this.service.findMany(ability, where || {}, select);
		}
		
		/**
		 * Mutation to create a new entity
		 *
		 * @param {GraphQLResolveInfo} info - GraphQL resolve info for field selection
		 * @param {CreateInput} args - The data to create the entity with
		 * @returns {Promise<Item>} The newly created entity
		 */
		@Mutation(() => options.entity, {
			name: `${options.modelName}Create`,
		})
		@CanPerform({
			action: Action.Create,
			// @ts-ignore
			resource: ModelName
		})
		async create(
			@Info() info: GraphQLResolveInfo,
			@Args('data', { type: () => options.createInput }) args: CreateInput
		): Promise<Item> {
			const select = this.service.fieldSelectionProvider.parseSelection<Item>(info);
			return this.service.create(args, select);
		}
		
		/**
		 * Mutation to update a single entity by ID
		 *
		 * @param {any} ability - The user's ability for authorization
		 * @param {GraphQLResolveInfo} info - GraphQL resolve info for field selection
		 * @param {UpdateInput} data - The data to update
		 * @param {string} id - The ID of the entity to update
		 * @returns {Promise<Item>} The updated entity
		 */
		@Mutation(() => options.entity, {
			name: `${options.modelName}Update`,
		})
		@CanPerform({
			action: Action.Update,
			// @ts-ignore
			resource: ModelName
		})
		async updateOne(
			@Info() info: GraphQLResolveInfo,
			@CurrentAbility.HTTP() ability: AppAbilityType,
			@Args('data', { type: () => options.updateInput }) data: UpdateInput,
			@Args('id', { type: () => String }) id: string
		): Promise<Item> {
			const select = this.service.fieldSelectionProvider.parseSelection<Item>(info);
			return this.service.update(ability, data, id, select);
		}
		
		/**
		 * Mutation to update multiple entities matching criteria
		 *
		 * @param {any} ability - The user's ability for authorization
		 * @param {GraphQLResolveInfo} info - GraphQL resolve info for field selection
		 * @param {UpdateManyInput} data - The data to update
		 * @param {WhereInput} where - Filter criteria for entities to update
		 * @returns {Promise<Item[]>} Array of updated entities
		 */
		@Mutation(() => [options.entity], {
			name: `${options.modelName}UpdateMany`,
		})
		@CanPerform({
			action: Action.Update,
			// @ts-ignore
			resource: ModelName
		})
		async updateMany(
			@Info() info: GraphQLResolveInfo,
			@CurrentAbility.HTTP() ability: AppAbilityType,
			@Args('data', { type: () => options.updateManyInput }) data: UpdateManyInput,
			@Args('where', { type: () => options.whereInput }) where: WhereInput
		): Promise<Item[]> {
			const select = this.service.fieldSelectionProvider.parseSelection<Item>(info);
			return this.service.updateMany(ability, data, where, select);
		}
		
		/**
		 * Mutation to delete a single entity by ID
		 *
		 * @param {any} ability - The user's ability for authorization
		 * @param {GraphQLResolveInfo} info - GraphQL resolve info for field selection
		 * @param {string} id - The ID of the entity to delete
		 * @returns {Promise<Item>} The deleted entity
		 */
		@Mutation(() => options.entity, {
			name: `${options.modelName}Delete`,
		})
		@CanPerform({
			action: Action.Delete,
			// @ts-ignore
			resource: ModelName
		})
		async deleteOne(
			@Info() info: GraphQLResolveInfo,
			@CurrentAbility.HTTP() ability: AppAbilityType,
			@Args('id', { type: () => String }) id: string
		): Promise<Item> {
			const select = this.service.fieldSelectionProvider.parseSelection<Item>(info);
			return this.service.delete(ability, id, select);
		}
		
		/**
		 * Mutation to delete multiple entities matching criteria
		 *
		 * @param {any} ability - The user's ability for authorization
		 * @param {GraphQLResolveInfo} info - GraphQL resolve info for field selection
		 * @param {WhereInput} where - Filter criteria for entities to delete
		 * @returns {Promise<Item[]>} Array of deleted entities
		 */
		@Mutation(() => [options.entity], {
			name: `${options.modelName}DeleteMany`,
		})
		@CanPerform({
			action: Action.Delete,
			// @ts-ignore
			resource: ModelName
		})
		async deleteMany(
			@Info() info: GraphQLResolveInfo,
			@CurrentAbility.HTTP() ability: AppAbilityType,
			@Args('where', { type: () => options.whereInput }) where: WhereInput
		): Promise<Item[]> {
			const select = this.service.fieldSelectionProvider.parseSelection<Item>(info);
			return this.service.deleteMany(ability, where, select);
		}
		
		/**
		 * Subscription to receive real-time updates for this entity type
		 *
		 * @param {any} where - Filter criteria for the subscription
		 */
		@Subscription(() => [options.entity], {
			// @ts-ignore
			filter(this: BaseCrudResolver, payload: { data: any[] }, variables: { filter: any }) {
				return this.resolver.filter(variables.filter, payload.data);
			},
			// @ts-ignore
			resolve(this: BaseCrudResolver, payload: { data: any[] }, variables: { filter: any }, _ctx, info)  {
				return this.resolver.resolve(variables.filter, payload.data, info);
			}
		})
		async [`${options.modelName}s`](
			@Args('filter', {
				type: () => SubscriptionFilter,
				nullable: true,
			}) where: any
		) {
			return this.pubSub.asyncIterableIterator(options.modelName);
		}
	}
	
	// Give the dynamic class a descriptive name for easier debugging
	Object.defineProperty(BaseCrudResolver, 'name', {
		value: `${ModelName}Resolver`,
		writable: false,
	});
	
	return BaseCrudResolver;
}