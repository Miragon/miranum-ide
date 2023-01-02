import React from "react";
import {useVsMessage} from "../Hooks/Message";
import {Button, TextField, Grid} from "@mui/material";
import {Add} from "@mui/icons-material";

interface Props {
    path: string
    setPath: any
}

const FileSelector: React.FC<Props> = props => {
    const openFilePicker =  useVsMessage("openFilePicker");

    return (
        <div>
            <Grid container spacing={0.5}>
                <Grid item xs={6.7} style={{flexBasis:"67%", maxWidth:"67%"}}>
                    <TextField
                        required
                        id="path"
                        label="Path"
                        name="path"
                        value={props.path}
                        style={{width:"100%"}}
                        onChange={e => {
                            props.setPath(e.target.value);
                        }}
                        error={props.path === ''}
                        helperText={(props.path === '')? 'You have to insert a path!':' '}
                    />
                </Grid>
                <Grid item xs={5.3} style={{flexBasis:"33%", maxWidth:"33%"}}>
                    <Button
                        variant="outlined"
                        startIcon={<Add/>}
                        style={{padding:"3px 12px"}}
                        onClick={() => openFilePicker({})}
                    >
                        Choose Path
                    </Button>
                </Grid>
            </Grid>
        </div>
    );
}

export default FileSelector;
