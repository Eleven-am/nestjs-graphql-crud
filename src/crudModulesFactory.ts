/**
 * @module crudModulesFactory
 * @description Factory for creating and registering CRUD modules
 */

import { createBaseCrudModule } from "./createBaseCrudModule";
import { PubSub } from "graphql-subscriptions";
import { DynamicModule, Provider, Type } from "@nestjs/common";
import { CrudModuleConfig } from "./crudModuleConfig";
import { DataProvider, FieldSelectionProvider } from "./internalTypes";
import { PUB_SUB_SYMBOL, createFindMany } from "./decorators";

/**
 * Factory class for creating and registering CRUD modules
 */
export class CrudModulesFactory {
    /**
     * Creates a factory builder for a specific entity type
     *
     * @template Item - The entity type
     * @param {Type<Item>} entity - The entity class
     */
    static forEntity<Item>(entity: Type<Item>) {
        return {
            /**
             * Configures a CRUD module for this entity
             *
             * @template CreateInput - The input type for create operations
             * @template UpdateInput - The input type for update operations
             * @template UpdateManyInput - The input type for update many operations
             * @template WhereInput - The input type for query filters
             *
             * @param {{ modelName: string; createInput: Type<CreateInput>; updateInput: Type<UpdateInput>; updateManyInput: Type<UpdateManyInput>; whereInput: Type<WhereInput> }} config - Configuration for the CRUD module
             * @returns {CrudModuleConfig<Item, CreateInput, UpdateInput, UpdateManyInput, WhereInput>} A configuration builder for further customization
             */
            withConfig<
                CreateInput,
                UpdateInput,
                UpdateManyInput,
                WhereInput,
            >(config: {
                modelName: string;
                createInput: Type<CreateInput>;
                updateInput: Type<UpdateInput>;
                updateManyInput: Type<UpdateManyInput>;
                whereInput: Type<WhereInput>;
            }): CrudModuleConfig<Item, CreateInput, UpdateInput, UpdateManyInput, WhereInput> {
                return new CrudModuleConfig<Item, CreateInput, UpdateInput, UpdateManyInput, WhereInput>({
                    ...config,
	                findManyArgs: createFindMany(config.whereInput, config.modelName),
	                entity,
                });
            }
        };
    }

    /**
     * Creates a factory with specified provider implementations
     *
     * @param {Type<DataProvider>} dataProvider - The data provider implementation
     * @param {Type<FieldSelectionProvider>} fieldSelectionProvider - The field selection provider implementation
     * @returns An object with methods to configure and create modules
     */
    static using(
        dataProvider: Type<DataProvider>,
        fieldSelectionProvider: Type<FieldSelectionProvider>
    ) {
        return {
            /**
             * Creates and registers all CRUD modules using the specified providers
             *
             * @param {CrudModuleConfig<any, any, any, any, any>[]} configBuilders - Array of CRUD module configurations
             * @param {any} [configBuilders] - Optional provider-specific configuration
             * @returns {DynamicModule} A NestJS dynamic module incorporating all configured CRUD modules
             */
            forRoot(
                configBuilders: CrudModuleConfig<any, any, any, any, any>[],
            ): DynamicModule {
                // Create tokens for the providers
                const dataProviderToken = Symbol('DataProvider');
                const fieldSelectionProviderToken = Symbol('FieldSelectionProvider');

                // Create providers
                const pubSubProvider: Provider = {
                    provide: PUB_SUB_SYMBOL,
                    useValue: new PubSub()
                };

                const dataProviderInstanceProvider: Provider = {
                    provide: dataProviderToken,
                    useClass: dataProvider
                };

                const fieldSelectionProviderInstanceProvider: Provider = {
                    provide: fieldSelectionProviderToken,
                    useClass: fieldSelectionProvider
                };

                // Create each CRUD module
                const crudModules = configBuilders.map(builder => {
                    return createBaseCrudModule(
                        dataProviderToken,
                        fieldSelectionProviderToken,
                        builder.options
                    );
                });

                // Return the combined module
                return {
                    global: true,
                    imports: crudModules,
                    module: CrudModulesFactory,
                    providers: [
                        pubSubProvider,
                        dataProviderInstanceProvider,
                        fieldSelectionProviderInstanceProvider
                    ],
                    exports: [
                        pubSubProvider,
                        dataProviderInstanceProvider,
                        fieldSelectionProviderInstanceProvider
                    ],
                };
            }
        };
    }
}