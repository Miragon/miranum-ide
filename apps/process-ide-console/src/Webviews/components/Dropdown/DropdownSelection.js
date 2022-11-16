import Dropdown from 'react-bootstrap/Dropdown';

function DropdownSelection() {
  return (
    <Dropdown>
        <Dropdown.Toggle variant="success" id="dropdown-basic">
            type
        </Dropdown.Toggle>
        <Dropdown.Menu>
            <Dropdown.Item href="#/action-1">bpmn</Dropdown.Item>
            <Dropdown.Item href="#/action-2">dmn</Dropdown.Item>
            <Dropdown.Item href="#/action-3">form</Dropdown.Item>
            <Dropdown.Item href="#/action-4">element-template</Dropdown.Item>
             <Dropdown.Item href="#/action-5">config</Dropdown.Item>
        </Dropdown.Menu>
    </Dropdown>
  );
}

export default DropdownSelection;
