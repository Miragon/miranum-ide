// import Ids from "ids";
//
// import { is } from "bpmn-js/lib/util/ModelUtil";
//
// /**
//  * Create a new element and set its parent.
//  *
//  * @param {String} elementType of the new element
//  * @param {Object} properties of the new element in key-value pairs
//  * @param {moddle.object} parent of the new element
//  * @param {BpmnFactory} factory which creates the new element
//  *
//  * @returns {djs.model.Base} element which is created
//  */
// export function createElement(
//     elementType: any,
//     properties: any,
//     parent: any,
//     factory: any,
// ) {
//     const element = factory.create(elementType, properties);
//
//     if (parent) {
//         element.$parent = parent;
//     }
//
//     return element;
// }
//
// /**
//  * generate a semantic id with given prefix
//  */
// export function nextId(prefix: any) {
//     const ids = new Ids([32, 32, 1]);
//
//     return ids.nextPrefixed(prefix);
// }
//
// export function getRoot(businessObject: any) {
//     let parent = businessObject;
//
//     while (parent.$parent) {
//         parent = parent.$parent;
//     }
//
//     return parent;
// }
//
// export function filterElementsByType(objectList: any, type: any) {
//     const list = objectList || [];
//
//     return list.filter((element: any) => is(element, type));
// }
//
// export function findRootElementsByType(businessObject: any, referencedType: any) {
//     const root = getRoot(businessObject);
//
//     return filterElementsByType(root.get("rootElements"), referencedType);
// }
//
// export function findRootElementById(businessObject: any, type: any, id: any) {
//     const elements = findRootElementsByType(businessObject, type);
//
//     return elements.find((element: any) => element.id === id);
// }
