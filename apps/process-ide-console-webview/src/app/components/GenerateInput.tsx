import * as React from 'react';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useVsMessage} from "./Hooks/Message";
import { Avatar, Box, Button, FormControl, InputLabel, MenuItem, Select, TextField, Typography } from "@mui/material";
import { Description } from "@mui/icons-material";
import FileSelector from "./UI/FileSelector";
import {DigiwfConfig, DigiwfLib} from "@miragon-process-ide/digiwf-lib";

interface Props {
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
    const [error, setError] = useState<string>("")
    const inputChange = useVsMessage("changedInput");
    const sendArtifactMessage = useVsMessage("generateArtifact");
    const digiwfLib = useMemo(() => {
        return new DigiwfLib(props.config)
    }, [props.config]);

    useEffect(() => {
        setPath(props.currentPath);
    }, [props.currentPath]);

    const generate = useCallback(() => {
        if (name !== '' && path !== '') {
            digiwfLib.generateArtifact(name, type, digiwfLib.projectConfig?.name ?? "")
                .then((artifact: any) => {
                    sendArtifactMessage({
                        path: path,
                        artifact: artifact
                    })
                })
                .catch((err: any) => setError(err.message));
        }
    }, [name, path, digiwfLib, type, sendArtifactMessage]);

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
                        inputChange({name: e.target.value, type: type});
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
                            inputChange({name: name, type: e.target.value});
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
                        path={path}
                        setPath={(p: string) => setPath(p)}
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
            {error !== '' && <Typography variant="subtitle1" borderColor="red">{error}</Typography>}
        </FormControl>
    );
}

export default GenerateInput;
