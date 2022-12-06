import React, { useCallback } from "react";
import CSS from 'csstype';
import { Button, TextField } from "@mui/material";
import { Add } from "@mui/icons-material";

const pathSelector: CSS.Properties = {
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
    margin: 'normal'
};

interface Props {
    vs: any,
    path: string
    onPathChange: any
}

const FileSelector: React.FC<Props> = props => {

    const openFilePicker =  useCallback(() => {
        props.vs.postMessage({
            command:'openFilePicker',
        })
    }, [props.vs]);

    return (
        <div style={pathSelector}>
            <TextField
                required
                id="path"
                label="Path"
                name="path"
                value={props.path}
                onChange={e => {
                    props.onPathChange(e.target.value);
                }}
                error={props.path === ''}
            />
            <Button onClick={openFilePicker} variant="outlined" startIcon={<Add/>}>
                Choose Path
            </Button>
        </div>
    );
}

export default FileSelector;
