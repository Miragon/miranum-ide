import React from "react";
import {useVsMessage} from "../Hooks/Message";
import CSS from 'csstype';
import {Button, TextField, Typography} from "@mui/material";
import {Add} from "@mui/icons-material";

const pathSelector: CSS.Properties = {
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
    margin: 'normal'
};

interface Props {
    path: string
    setPath: any
}

const FileSelector: React.FC<Props> = props => {
    const openFilePicker =  useVsMessage("openFilePicker");

    return (
        <div>
            <div style={pathSelector}>
                <TextField
                    required
                    id="path"
                    label="Path"
                    name="path"
                    value={props.path}
                    onChange={e => {
                        props.setPath(e.target.value);
                    }}
                    error={props.path === ''}
                />
                <Button onClick={() => openFilePicker({})} variant="outlined" startIcon={<Add/>}>
                    Choose Path
                </Button>
            </div>
            {props.path === '' && <Typography variant="subtitle2" color="red">You have to insert a path!</Typography>}
        </div>
    );
}

export default FileSelector;
