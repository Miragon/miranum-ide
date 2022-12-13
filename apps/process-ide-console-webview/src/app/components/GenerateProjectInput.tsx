import * as React from 'react';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useVsMessage} from "./Hooks/Message";
import { Avatar, Box, Button, FormControl, TextField, Typography } from "@mui/material";
import { CreateNewFolder } from "@mui/icons-material";
import FileSelector from "./UI/FileSelector";
import {DigiwfLib} from "@miragon-process-ide/digiwf-lib";

interface Props {
    currentPath: string;
    name: string;
}

const GenerateProjectInput: React.FC<Props> = props => {
    const [name, setName] = useState<string>(props.name);
    const [path, setPath] = useState<string>(props.currentPath);
    const [pressed, setPressed] = useState<boolean>(false);
    const [error, setError] = useState<string>("")
    const inputChange = useVsMessage("changedInput");
    const sendProjectMessage = useVsMessage("generateProject");
    const digiwfLib = useMemo(() => {return new DigiwfLib()}, []);

    useEffect(() => {
        setPath(props.currentPath);
    }, [props.currentPath]);

    const generate = useCallback(() => {
        if(name !== "" && path !== "") {
            digiwfLib.initProject(name)
                .then((artifacts: any) => {
                    sendProjectMessage({
                        name: name,
                        path: path,
                        artifacts: artifacts
                    })
                })
                .catch((err: any) => setError(err.message));
        }
    }, [name, path, digiwfLib, sendProjectMessage]);

    return (
            <FormControl
                sx={{
                    marginTop: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
                    <CreateNewFolder />
                </Avatar>
                <Typography component="h1" variant="h5">
                    Generate Project
                </Typography>
                <Box component="form" noValidate sx={{ mt: 1 }}>
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
                            inputChange({name: e.target.value});
                        }}
                        autoFocus
                        error={name === ''}
                        helperText={(name === '' && pressed)? 'You have to insert a name!':' '}
                    />
                    <FileSelector
                        path={path}
                        setPath={ (p:string) => setPath(p)}
                    />
                    <Button
                        onClick={() => {
                            setPressed(!name || !path);
                            generate();
                        }}
                        fullWidth
                        variant="contained"
                        color="secondary"
                        sx={{ mt: 3, mb: 2 }}
                    >generate Project</Button>
                </Box>
                {error !== '' && <Typography variant="subtitle1" borderColor="red">{error}</Typography>}
            </FormControl>
    );
}

export default GenerateProjectInput;
