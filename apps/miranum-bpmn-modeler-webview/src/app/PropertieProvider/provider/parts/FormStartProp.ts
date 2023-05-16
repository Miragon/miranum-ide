import { isSelectEntryEdited, SelectEntry } from "@bpmn-io/properties-panel";
import { useService } from "bpmn-js-properties-panel";
import { useEffect, useState } from "@bpmn-io/properties-panel/preact/hooks";
import { getFormKeys } from "../../../utils";

export default function (element: any) {
    return [
        {
            id: "formKey",
            element,
            component: Form,
            isEdited: isSelectEntryEdited,
        },
    ];
}

//camunda:formKey = Embedded or External Task Forms
//camunda:formRef = Camunda Forms
function Form(props: any) {
    const { element, id } = props;
    const modeling = useService("modeling");
    const translate = useService("translate");
    const debounce = useService("debounceInput");

    const getValue = () => {
        return element.businessObject.formKey || "";
    };

    const setValue = (value: any) => {
        return modeling.updateProperties(element, {
            formKey: value,
        });
    };

    //fetch forms (from window variable) and fill Forms with it
    const [forms, setForms] = useState<string[]>([]);
    useEffect(() => {
        setForms(getFormKeys()); // window.forms);
    }, [setForms]);

    const getOptions = () => {
        return [
            { label: "<none>", value: undefined },
            ...forms.map((form) => ({
                label: form,
                value: form,
            })),
        ];
    };

    return SelectEntry({
        element,
        id: { id },
        label: translate("Choose your Form"),
        getValue,
        setValue,
        getOptions,
        debounce,
    });
}
