import * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { Avatar, Box, Button, FormControl, InputLabel, MenuItem, Select, TextField, Typography } from "@mui/material";
import { Description } from "@mui/icons-material";
import FileSelector from "./UI/FileSelector";
import { DigiwfLib } from "@miragon-process-ide/digiwf-lib";

interface Props {
    vs: any;
    config: any;
    currentPath: string;
}

const GenerateInput: React.FC<Props> = props => {
    const [name, setName] = useState<string>("");
    const [type, setType] = useState<string>("bpmn");
    const [path, setPath] = useState<string>(props.currentPath);

    const digiwfLib = useMemo(() => {
        return new DigiwfLib(props.config)
    }, [props.config]);

    const generate = useCallback(() => {
        if (name !== '' && path !== '') {
            // project does not matter
            digiwfLib.generateArtifact(name, type,  digiwfLib.projectConfig?.name ?? "")
                .then(artifact => {
                    // todo move this into a custom hook
                    props.vs.postMessage({
                        command: 'generateArtifact',
                        data: {
                            artifact: artifact,
                            path: `${path}`
                        }
                    });
                })
                .catch(err => console.error(err));
        }
    }, [name, type, path, props.vs, digiwfLib]);

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
