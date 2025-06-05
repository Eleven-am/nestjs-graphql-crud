/**
 * @module createBaseCrudService
 * @description Creates a service class that implements CRUD operations using a data provider
 */

import {Inject, Injectable, Type} from "@nestjs/common";
import {CrudAction, DataProvider, FieldSelectionProvider, FindManyContract, IGenericCrudService} from "./internalTypes";
import {CurrentPubSub, firstLetterUppercase} from "./decorators";
import {PubSub} from "graphql-subscriptions";
import {AppAbilityType} from "@eleven-am/authorizer";
import {ModuleRef} from "@nestjs/core";

/**
 * Creates a service class with standard CRUD operations for a specific model
 *
 * @template Item - The entity type this service will manage
 * @template CreateInput - The input type for create operations
 * @template UpdateInput - The input type for update operations
 * @template UpdateManyInput - The input type for update many operations
 * @template WhereInput - The input type for query filters
 * @template Target - The related entity type for one-to-many relations
 * @template TargetWhereInput - The input type for query filters for the related entity
 * @template TResolver - The type of the resolver class
 *
 * @param {string} modelName - The name of the model
 * @param {symbol} dataProviderToken - Symbol for the data provider token
 * @param {symbol} fieldSelectionToken - Symbol for the field selection provider token
 * @returns {Type} A dynamically generated service class with CRUD operations
 */
export function createBaseCrudService<
	Item,
	CreateInput,
	UpdateInput,
	UpdateManyInput,
	WhereInput,
	Target,
	TargetWhereInput,
	TResolver extends object,
>
(
	modelName: string,
	dataProviderToken: symbol,
	fieldSelectionToken: symbol,
): Type {
	@Injectable()
	class BaseCrudService implements IGenericCrudService<
		Item,
		CreateInput,
		UpdateInput,
		UpdateManyInput,
		WhereInput,
		Target,
		TargetWhereInput,
		TResolver
	> {
		constructor(
			private readonly moduleRef: ModuleRef,
			@CurrentPubSub() private readonly pubSub: PubSub,
			@Inject(dataProviderToken) private readonly dataProvider: DataProvider,
			@Inject(fieldSelectionToken) readonly fieldSelectionProvider: FieldSelectionProvider
		) {
		}
		
		/**
		 * Create a new entity
		 *
		 * @param {CreateInput} data - The data to create the entity with
		 * @param {any} select - Fields to select in the result
		 * @returns {Promise<Item>} The newly created entity
		 */
		async create(data: CreateInput, select: any): Promise<Item> {
			const res = await this.dataProvider.create<Item, CreateInput>(
				modelName,
				data,
				select
			);
			await this.publish(CrudAction.CREATE, res);
			return res;
		}
		
		/**
		 * Delete an entity by ID
		 *
		 * @param {any} ability - The user's ability for authorization
		 * @param {string} whereId - The ID of the entity to delete
		 * @param {any} select - Fields to select in the result
		 * @returns {Promise<Item>} The deleted entity
		 */
		async delete(ability: any, whereId: string, select: any): Promise<Item> {
			const res = await this.dataProvider.delete<Item>(
				modelName,
				ability,
				whereId,
				select
			);
			await this.publish(CrudAction.DELETE, res);
			return res;
		}
		
		/**
		 * Delete multiple entities matching criteria
		 *
		 * @param {any} ability - The user's ability for authorization
		 * @param {WhereInput} where - Filter criteria for entities to delete
		 * @param {any} select - Fields to select in the result
		 * @returns {Promise<Item[]>} Array of deleted entities
		 */
		async deleteMany(ability: any, where: WhereInput, select: any): Promise<Item[]> {
			const gotDeleted = await this.dataProvider.findMany<Item, WhereInput>(
				modelName,
				ability,
				{where},
				select
			);
			
			await this.dataProvider.deleteMany<Item, WhereInput>(
				modelName,
				ability,
				where,
				select
			);
			
			await this.publish(CrudAction.DELETE_MANY, gotDeleted);
			return gotDeleted;
		}
		
		/**
		 * Find multiple entities matching criteria
		 * Now supports both custom FindManyArgs and default FindManyContract
		 *
		 * @param {any} ability - The user's ability for authorization
		 * @param {any} args - Filter and pagination criteria (can be custom or default format)
		 * @param {any} select - Fields to select in the result
		 * @returns {Promise<Item[]>} Array of matched entities
		 */
		async findMany(ability: any, args: any, select: any): Promise<Item[]> {
			// Normalize args to handle both custom FindManyArgs and default FindManyContract
			let normalizedArgs: any;
			
			if (args.where !== undefined || args.pagination !== undefined) {
				// Default FindManyContract format { where?: WhereInput, pagination?: PaginationContract }
				normalizedArgs = {
					where: args.where || ({} as WhereInput),
					pagination: args.pagination,
					orderBy: undefined // Default doesn't support orderBy
				};
			} else {
				// Custom FindManyArgs format (like prisma-nest-graphql generates)
				// Extract fields directly from the args object
				normalizedArgs = {
					where: args.where || ({} as WhereInput),
					pagination: {
						take: args.take,
						skip: args.skip
					},
					orderBy: args.orderBy,
					cursor: args.cursor,
					distinct: args.distinct
				};
			}
			
			return this.dataProvider.findMany<Item, WhereInput>(
				modelName,
				ability,
				normalizedArgs,
				select
			);
		}
		
		/**
		 * Find a single entity by criteria
		 *
		 * @param {any} ability - The user's ability for authorization
		 * @param {WhereInput} where - Filter criteria
		 * @param {any} select - Fields to select in the result
		 * @returns {Promise<Item | null>} The found entity or null
		 */
		async findOne(ability: any, where: WhereInput, select: any): Promise<Item | null> {
			return this.dataProvider.findOne<Item, WhereInput>(
				modelName,
				ability,
				where,
				select
			);
		}
		
		/**
		 * Update a single entity by ID
		 *
		 * @param {any} ability - The user's ability for authorization
		 * @param {UpdateInput} data - The data to update
		 * @param {string} whereId - The ID of the entity to update
		 * @param {any} select - Fields to select in the result
		 * @returns {Promise<Item>} The updated entity
		 */
		async update(ability: any, data: UpdateInput, whereId: string, select: any): Promise<Item> {
			const res = await this.dataProvider.update<Item, UpdateInput>(
				modelName,
				ability,
				data,
				whereId,
				select
			);
			
			await this.publish(CrudAction.UPDATE, res);
			return res;
		}
		
		/**
		 * Update multiple entities matching criteria
		 *
		 * @param {any} ability - The user's ability for authorization
		 * @param {UpdateManyInput} data - The data to update
		 * @param {WhereInput} where - Filter criteria for entities to update
		 * @param {any} select - Fields to select in the result
		 * @returns {Promise<Item[]>} Array of updated entities
		 */
		async updateMany(ability: any, data: UpdateManyInput, where: WhereInput, select: any): Promise<Item[]> {
			const gotUpdated = await this.dataProvider.findMany<Item, WhereInput>(
				modelName,
				ability,
				{where},
				select
			);
			
			await this.dataProvider.updateMany<Item, UpdateManyInput, WhereInput>(
				modelName,
				ability,
				data,
				where,
				select
			);
			
			await this.publish(CrudAction.UPDATE_MANY, gotUpdated);
			return gotUpdated;
		}
		
		/**
		 * Resolve a one-to-one relation
		 *
		 * @param {any} ability - The user's ability for authorization
		 * @param {string} targetModel - The name of the target model
		 * @param {string} itemId - The ID of the related item
		 * @param {any} select - Fields to select in the result
		 * @returns {Promise<unknown>} The related entity or null
		 */
		resolveOneToOne(ability: AppAbilityType, targetModel: string, itemId: string, select: any): Promise<Target | null> {
			return this.dataProvider.findOne<Target, { id: string }>(
				targetModel,
				ability,
				{id: itemId} as any,
				select
			);
		}
		
		/**
		 * Resolve a one-to-many relation
		 *
		 * @param {any} ability - The user's ability for authorization
		 * @param {string} targetModel - The name of the target model
		 * @param {string} foreignKey - The foreign key field name
		 * @param {string} itemId - The ID of the related item
		 * @param {any} select - Fields to select in the result
		 * @param {any} [where] - Optional filter criteria for the related entities
		 */
		resolveOneToMany(ability: AppAbilityType, targetModel: string, foreignKey: string, itemId: string, select: any, where?: any): Promise<Target[]> {
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
		 * Get the factory for a specific resolver
		 *
		 * @param {Type<TResolver>} constructor - The constructor of the resolver
		 */
		getFactory<TResolver>(constructor: Type<TResolver>): TResolver {
			return this.moduleRef.get(constructor, {strict: false});
		}
		
		/**
		 * Publish changes to subscribers
		 *
		 * @private
		 * @param {CrudAction} action - The type of action that occurred
		 * @param {any} data - The data to publish
		 * @returns {Promise<void>}
		 */
		async publish(action: CrudAction, data: any): Promise<void> {
			const arrayData = Array.isArray(data) ? data : [data];
			
			await this.pubSub.publish(modelName, {
				action,
				data: arrayData,
			});
		}
	}
	
	Object.defineProperty(BaseCrudService, 'name', {
		value: `${firstLetterUppercase(modelName)}Service`,
		writable: false,
	});
	
	return BaseCrudService;
}
