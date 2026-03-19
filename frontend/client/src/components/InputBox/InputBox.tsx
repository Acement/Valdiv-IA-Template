import React from "react";
import { Input } from "@chakra-ui/react";

interface InputBoxProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}

const InputBox: React.FC<InputBoxProps> = ({ value, onChange, placeholder }) => {
  return <Input value={value} onChange={onChange} placeholder={placeholder || "Escribe algo..."} />;
};

export default InputBox;
