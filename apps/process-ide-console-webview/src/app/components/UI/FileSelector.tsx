import React, {useCallback, useState} from "react";
import CSS from 'csstype';
import {Button, TextField} from "@mui/material";
import {Add} from "@mui/icons-material";

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
    const [path, setPath] = useState(props.path);

    const openFilePicker =  useCallback(() => {
        props.vs.postMessage({
            message:'openFilePicker',
        })
    }, [props.vs]);

    //html Version:             (Issue: only files are selectable)
    // return (
    //     <Button fullWidth variant="outlined" startIcon={<Add/>} component="label">
    //         Choose Path
    //         <input hidden type="file" accept="" multiple/>
    //     </Button>
    // );

    //VS Version:
    return (
        <div style={pathSelector}>
            <TextField
                required
                id="path"
                label="Path"
                name="path"
                value={path}
                onChange={e => {
                    setPath(e.target.value);
                    props.onPathChange(e.target.value);
                }}
            />
            <Button onClick={openFilePicker} variant="outlined" startIcon={<Add/>}>
                Choose Path
            </Button>
        </div>
    );
}

export default FileSelector;
