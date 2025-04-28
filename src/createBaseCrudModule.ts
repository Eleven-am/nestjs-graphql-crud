/**
 * @module createBaseCrudModule
 * @description Creates a dynamically generated NestJS module with CRUD operations for a specific model
 */

import { CrudModuleOptions } from "./internalTypes";
import { createBaseCrudService } from "./createBaseCrudService";
import { DynamicModule, Provider } from "@nestjs/common";
import { createBaseCrudResolver } from "./createBaseCrudResolver";
import { firstLetterUppercase } from "./decorators";
import { createCombinedRelationResolverClass } from "./createCombinedRelationResolverClass";

/**
 * Creates a NestJS dynamic module that provides CRUD operations for a specific model
 *
 * @template Item - The entity type this CRUD module will manage
 * @template CreateInput - The input type for create operations
 * @template UpdateInput - The input type for update operations
 * @template UpdateManyInput - The input type for update many operations
 * @template WhereInput - The input type for query filters
 *
 * @param {symbol} dataProviderToken - Symbol for the data provider token
 * @param {symbol} fieldSelectionProviderToken - Symbol for the field selection provider token
 * @param {CrudModuleOptions<Item, CreateInput, UpdateInput, UpdateManyInput, WhereInput>} options - Configuration options for the CRUD module
 * @returns {DynamicModule} A dynamically generated NestJS module with CRUD capabilities
 */
export function createBaseCrudModule <
    Item,
    CreateInput,
    UpdateInput,
    UpdateManyInput,
    WhereInput,
>(
    dataProviderToken: symbol,
    fieldSelectionProviderToken: symbol,
    options: CrudModuleOptions<
        Item,
        CreateInput,
        UpdateInput,
        UpdateManyInput,
        WhereInput
    >
): DynamicModule {
    const serviceToken = Symbol(`${options.modelName}Service`);

    const BaseCrudService = createBaseCrudService(
        options.modelName,
        dataProviderToken,
        fieldSelectionProviderToken,
    );

    const BaseCrudResolver = createBaseCrudResolver(
        serviceToken,
        options
    );

    const BaseCrudServiceProvider: Provider = { provide: serviceToken, useClass: BaseCrudService };

    const CrudResolver = createCombinedRelationResolverClass(
        options.modelName,
        options.entity,
        BaseCrudResolver,
        options.resolvers
    );

    class BaseCrudModule {
        /**
         * Creates and configures the CRUD module with all necessary providers
         *
         * @returns {DynamicModule} Configured NestJS module
         */
        static forRoot(): DynamicModule {
            return {
                global: true,
                module: BaseCrudModule,
                imports: options.imports,
                exports: options.exports,
                controllers: options.controllers,
                providers: [
                    CrudResolver,
                    BaseCrudServiceProvider,
                    ...(options.providers ?? []),
                ],
            };
        }
    }

    Object.defineProperty(BaseCrudModule, 'name', {
        value: `${firstLetterUppercase(options.modelName)}Module`,
        writable: false,
    });

    return BaseCrudModule.forRoot();
}