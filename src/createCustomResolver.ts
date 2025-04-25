import {Type} from "@nestjs/common";
import {CustomResolver, IResolver} from "./internalTypes";
import {Args, Info, Mutation, Parent, Query, ResolveField, Resolver} from "@nestjs/graphql";
import {AppAbilityType, CanPerform, CurrentAbility} from "@eleven-am/authorizer";
import {GraphQLResolveInfo} from "graphql/type";
import {firstLetterUppercase} from "./decorators";

export function createCustomResolver<
    Item,
    Target,
    TResolver extends object,
    MethodName extends keyof TResolver,
>(
    item: Type<Item>,
    modelName: string,
    FactoryClass: Type<TResolver>,
    config: CustomResolver<TResolver, MethodName>,
    ParentClass: Type<IResolver<any, any, any, any, any, Target, any, any>>
): Type<IResolver<any, any, any, any, any, Target, any, any>> {
    let Class: Type<IResolver<any, any, any, any, any, Target, any, any>>;
    if (config.isMutation) {
        @Resolver(() => item)
        class CustomResolverImpl extends ParentClass {
            @Mutation(() => item, {
                description: config.description,
            })
            @CanPerform(...config.permissions)
            async [config.name](
                @Info() info: GraphQLResolveInfo,
                @CurrentAbility.HTTP() ability: AppAbilityType,
                @Args('data', {type: () => config.inputType}) args: any
            ) {
                const select = this.service.fieldSelectionProvider.parseSelection<Item>(info);
                const factory = this.service.getFactory(FactoryClass);
                // @ts-ignore
                return factory[config.methodName](args, ability, select);
            }
        }

        Class = CustomResolverImpl;
    } else if (config.resolveField) {
        @Resolver(() => item)
        class CustomResolverImpl extends ParentClass {
            @ResolveField(config.resolveField, config.outputType)
            @CanPerform(...config.permissions)
            async [config.name](
                @Parent() item: Item,
                @Info() info: GraphQLResolveInfo,
                @CurrentAbility.HTTP() ability: AppAbilityType,
            ) {
                const select = this.service.fieldSelectionProvider.parseSelection<Target>(info);
                const factory = this.service.getFactory(FactoryClass);
                // @ts-ignore
                return factory[config.methodName](item, ability, select);
            }
        }

        Class = CustomResolverImpl;
    } else {
        @Resolver(() => item)
        class CustomResolverImpl extends ParentClass {
            @Query(() => item, {
                name: config.name,
                nullable: true,
            })
            @CanPerform(...config.permissions)
            async [config.name](
                @Info() info: GraphQLResolveInfo,
                @CurrentAbility.HTTP() ability: AppAbilityType,
                @Args('where', {type: () => config.inputType, nullable: config.nullable}) where?: any
            ): Promise<Item | null> {
                const select = this.service.fieldSelectionProvider.parseSelection<Item>(info);
                const factory = this.service.getFactory(FactoryClass);
                // @ts-ignore
                return factory[config.methodName](where, ability, select);
            }
        }

        Class = CustomResolverImpl;
    }

    const name = `${firstLetterUppercase(modelName)}${firstLetterUppercase(config.name)}Resolver`;

    Object.defineProperty(Class, 'name', {
        value: name,
        writable: false,
    });

    return Class;
}
