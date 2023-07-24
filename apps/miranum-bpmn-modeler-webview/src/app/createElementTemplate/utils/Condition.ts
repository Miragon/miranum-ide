// import { getPropertyValue } from "./propertyUtil";
//
// /**
//  * Based on conditions, remove properties from the template.
//  */
// export function applyConditions(element: any, elementTemplate: any) {
//     const { properties } = elementTemplate;
//
//     const filteredProperties = properties.filter((property: any) => {
//         return isConditionMet(element, properties, property);
//     });
//
//     return {
//         ...elementTemplate,
//         properties: filteredProperties,
//     };
// }
//
// export function isConditionMet(element: any, properties: any, property: any) {
//     const { condition } = property;
//
//     // If no condition is defined, return true.
//     if (!condition) {
//         return true;
//     }
//
//     // multiple ("and") conditions
//     if (condition.allMatch) {
//         const conditions = condition.allMatch;
//
//         return conditions.every((c: any) =>
//             isSimpleConditionMet(element, properties, c),
//         );
//     }
//
//     // single condition
//     return isSimpleConditionMet(element, properties, condition);
// }
//
// function isSimpleConditionMet(element: any, properties: any, condition: any) {
//     const { property, equals, oneOf } = condition;
//
//     const propertyValue = getValue(element, properties, property);
//
//     if (equals) {
//         return propertyValue === equals;
//     }
//
//     if (oneOf) {
//         return oneOf.includes(propertyValue);
//     }
//
//     return false;
// }
//
// export function getValue(element: any, properties: any, propertyId: any) {
//     const property = properties.find((p: any) => p.id === propertyId);
//
//     if (!property) {
//         return;
//     }
//
//     return getPropertyValue(element, property);
// }
