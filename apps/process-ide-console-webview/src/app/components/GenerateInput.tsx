import * as React from 'react';
import {useMemo, useState} from 'react';
import {useArtifactMessage, useInputChangeMessage} from "./Hooks/Message";
import { Avatar, Box, Button, FormControl, InputLabel, MenuItem, Select, TextField, Typography } from "@mui/material";
import { Description } from "@mui/icons-material";
import FileSelector from "./UI/FileSelector";
import {DigiwfConfig, DigiwfLib} from "@miragon-process-ide/digiwf-lib";

interface Props {
    vs: any;
    config: DigiwfConfig;
    currentPath: string;
    name: string;
    type: string;
}

const GenerateInput: React.FC<Props> = props => {
    const [name, setName] = useState<string>(props.name);
    const [type, setType] = useState<string>(props.type);
    const [path, setPath] = useState<string>(props.currentPath);
    const [pressed, setPressed] = useState<boolean>(false);

    const digiwfLib = useMemo(() => {
        return new DigiwfLib(props.config)
    }, [props.config]);

    const generate = useArtifactMessage(props.vs, digiwfLib, name, type, path);
    const inputChange = useInputChangeMessage(props.vs);

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
                        inputChange(e.target.value, type);
                    }}
                    autoFocus
                    error={name === ''}
                    helperText={(name === '' && pressed)? 'You have to insert a name!':' '}
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
                            inputChange(name, e.target.value);
                        }}
                    >
                        <MenuItem value="bpmn">bpmn</MenuItem>
                        <MenuItem value="dmn">dmn</MenuItem>
                        <MenuItem value="form">form</MenuItem>
                        <MenuItem value="element-template">element-template</MenuItem>
                        <MenuItem value="config">config</MenuItem>
                    </Select>
                </FormControl>
                {!digiwfLib.projectConfig &&
                    <FileSelector
                        vs={props.vs}
                        path={path}
                        onPathChange={(p: string) => setPath(p)}
                    />
                }
                <Button
                    onClick={() => {
                        setPressed(!name || !path);
                        generate();
                    }}
                    fullWidth
                    variant="contained"
                    color="secondary"
                    sx={{mt: 3, mb: 2}}
                >Generate</Button>
            </Box>
        </FormControl>
    );
}

export default GenerateInput;
