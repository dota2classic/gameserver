import 'reflect-metadata';
import { SelectQueryBuilder } from 'typeorm';

export const VIRTUAL_COLUMN_KEY = Symbol("VIRTUAL_COLUMN_KEY");
export const VIRTUAL_COLUMN_TYPE = Symbol("VIRTUAL_COLUMN_TYPE");

type Transformer<T> = (r: string) => T;

export function VirtualColumn2(
  name: string,
  type: Transformer<any>,
): PropertyDecorator {
  return (target, propertyKey) => {
    const metaInfo = Reflect.getMetadata(VIRTUAL_COLUMN_KEY, target) || {};
    const metaInfoType = Reflect.getMetadata(VIRTUAL_COLUMN_TYPE, target) || {};

    metaInfo[propertyKey] = name ?? propertyKey;
    metaInfoType[propertyKey] = type ?? propertyKey;

    Reflect.defineMetadata(VIRTUAL_COLUMN_KEY, metaInfo, target);
    Reflect.defineMetadata(VIRTUAL_COLUMN_TYPE, metaInfoType, target);
  };
}

declare module "typeorm" {
  interface SelectQueryBuilder<Entity> {
    getMany(this: SelectQueryBuilder<Entity>): Promise<Entity[] | undefined>;

    getOne(this: SelectQueryBuilder<Entity>): Promise<Entity | undefined>;
  }
}

function remapEntitiesWithVirtual(entities: any[], raw: any[]) {
  return entities.map((entity, index) => {
    const metaInfo = Reflect.getMetadata(VIRTUAL_COLUMN_KEY, entity) ?? {};
    const metaInfoType = Reflect.getMetadata(VIRTUAL_COLUMN_TYPE, entity) ?? {};

    const item = raw[index];

    for (const [propertyKey, name] of Object.entries<string>(metaInfo)) {
      const transformer = metaInfoType[propertyKey];
      const transformable = item[name] || entity[name];
      entity[propertyKey] = transformer(transformable);
    }

    return entity;
  });
}

// @ts-ignore
const originExecute = SelectQueryBuilder.prototype.executeEntitiesAndRawResults;
// @ts-ignore
SelectQueryBuilder.prototype.executeEntitiesAndRawResults = async function (
  queryRunner,
) {
  const { entities, raw } = await originExecute.call(this, queryRunner);

  const extendedEntities = remapEntitiesWithVirtual(entities, raw);
  return { entities: extendedEntities, raw };
};
