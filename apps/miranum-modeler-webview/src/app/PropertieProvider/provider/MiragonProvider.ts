import { is } from "bpmn-js/lib/util/ModelUtil";
import formStartProp from "./parts/FormStartProp";
import formUserProp from "./parts/FormUserProp";
import { getFormKeys } from "../../utils";

const LOW_PRIORITY = 500;

/**
 * A provider with a `#getGroups(element)` method
 * that exposes groups for a diagram element.
 *
 * @param {PropertiesPanel} propertiesPanel
 * @param {Function} translate
 */
export default function MiragonProvider(this: any, propertiesPanel: any, translate: any) {

    // API ////////

    /**
   * Return the groups provided for the given element.
   *
   * @param {DiagramElement} element
   *
   * @return {(Object[]) => (Object[])} groups middleware
   */
    this.getGroups = function (element: any) {

        /**
     * We return a middleware that modifies
     * the existing groups.
     *
     * @param {Object[]} groups
     *
     * @return {Object[]} modified groups
     */
        return function (groups: any) {

            //checks whether form files where loaded and either uses default property-panel, or Miranum's custom panel
            if (getFormKeys().length > 0) { //(window.forms.length > 0) {
                // Add own "form" group to StartEvent, and remove old Form property
                if (is(element, "bpmn:StartEvent")) {
                    groups.push(createStartFormGroup(element, translate));
                    groups = groups.filter((obj: any) => obj.id !== "CamundaPlatform__Form");
                }
                // Add own "form" group to UserTask, and remove old Form property
                if (is(element, "bpmn:UserTask")) {
                    groups.push(createUserFormGroup(element, translate));
                    groups = groups.filter((obj: any) => obj.id !== "CamundaPlatform__Form");
                }
            }

            return groups;
        };
    };

    // registration ////////
    // Use a lower priority to ensure it is loaded after the basic BPMN properties.
    propertiesPanel.registerProvider(LOW_PRIORITY, this);
}

MiragonProvider.$inject = [ "propertiesPanel", "translate" ];


//   -------------------------Custom Groups-------------------------   \\
// due to prefix 'ElementTemplates__' it will stay displayed even with templates active

function createStartFormGroup(element: any, translate: any) {
    return {
        id: "ElementTemplates__formSimplifier",
        label: translate("Form"),
        entries: formStartProp(element),
    };
}

function createUserFormGroup(element: any, translate: any) {
    return {
        id: "ElementTemplates__formSimplifier",
        label: translate("Form"),
        entries: formUserProp(element),
    };
}
