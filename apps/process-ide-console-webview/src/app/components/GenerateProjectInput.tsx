import * as React from 'react';
import { useCallback, useState } from 'react';
import { Avatar, Box, Button, FormControl, TextField, Typography } from "@mui/material";
import { CreateNewFolder } from "@mui/icons-material";

interface Props {
    vs: any;
    currentPath: string;
}

const GenerateProjectInput: React.FC<Props> = props => {

    const [name, setName] = useState<string>("");
    const [path, setPath] = useState<string>(props.currentPath);

    const generate =  useCallback(() => {
        if(name !== "" && path) {
            props.vs.postMessage({
                message:'generateProject',
                name: name,
                path: path
            })
        } else {
            props.vs.postMessage({message:'missingArguments'});
        }
    }, [name, path, props.vs]);

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
                        onChange={e => setName(e.target.value)}
                        autoFocus
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="path"
                        label="Path"
                        name="path"
                        value={path}
                        onChange={e => setPath(e.target.value)}
                    />
                    <Button
                        onClick={generate}
                        fullWidth
                        variant="outlined"
                        sx={{ mt: 3, mb: 2 }}
                    >Projekt generieren</Button>
                </Box>
            </FormControl>
    );
}

export default GenerateProjectInput;