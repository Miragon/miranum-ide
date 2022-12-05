import * as React from 'react';
import { useCallback, useState } from 'react';
import { Avatar, Box, Button, FormControl, InputLabel, MenuItem, Select, TextField, Typography } from "@mui/material";
import { Description } from "@mui/icons-material";
import FileSelector from "./UI/FileSelector";
//import * as fs from "fs/promises";

interface Props {
    vs: any;
    currentPath: string;
}

// const getProcessIDE = async (path:string) => {
//     return (await fs.lstat(`${path}/process-ide.json`)).isFile();
// }

const GenerateInput: React.FC<Props> = props => {
    //const PIDE = useAsync(getProcessIDE(props.currentPath));
    //console.log(PIDE);
    const PIDE = false;
    console.log(props.vs.getState());

    const [name, setName] = useState<string>("");
    const [type, setType] = useState<string>("bpmn");
    const [path, setPath] = useState<string>(props.currentPath);

    const generate = useCallback(() => {
        if (name !== '' && path !== '') {
            props.vs.postMessage({
                message: 'generate',
                name: name,
                type: type,
                path: path
            });
        }
    }, [name, type, path, props.vs]);

    return (
        <FormControl
            sx={{
                marginTop: 8,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
            }}
        >
            <Avatar sx={{m: 1, bgcolor: 'secondary.main'}}>
                <Description/>
            </Avatar>
            <Typography component="h1" variant="h5">
                Generate File
            </Typography>
            <Box component="form" noValidate sx={{mt: 1}}>
                <TextField
                    margin="normal"
                    required
                    fullWidth
                    id="name"
                    label="Name"
                    name="name"
                    value={name}
                    onChange={e => {
                        setName(e.target.value);
                        props.vs.setState({...props.vs.getState(), name: e.target.value});
                    }}
                    autoFocus
                    error={name === ''}
                />
                <FormControl fullWidth required>
                    <InputLabel id="typeLabel">Type</InputLabel>
                    <Select
                        id="type"
                        labelId="typeLabel"
                        name="type"
                        value={type}
                        onChange={e => {
                            setType(e.target.value);
                            props.vs.setState({...props.vs.getState(), type: e.target.value});
                        }}
                    >
                        <MenuItem value="bpmn">bpmn</MenuItem>
                        <MenuItem value="dmn">dmn</MenuItem>
                        <MenuItem value="form">form</MenuItem>
                        <MenuItem value="element-template">element-template</MenuItem>
                        <MenuItem value="config">config</MenuItem>
                    </Select>
                </FormControl>
                {PIDE ?
                    <></> :
                    <FileSelector
                        vs={props.vs}
                        path={props.currentPath}
                        onPathChange={(p: string) => setPath(p)}
                    />
                }
                <Button
                    onClick={generate}
                    fullWidth
                    variant="contained"
                    color="secondary"
                    sx={{mt: 3, mb: 2}}
                >Generieren</Button>
            </Box>
        </FormControl>
    );
}

export default GenerateInput;
